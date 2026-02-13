import express from "express";
import { WebSocketServer } from "ws";
import { spawn } from "child_process";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(join(__dirname, "public")));

wss.on("connection", (ws) => {
  console.log("Client connected");
  let activeProcess = null;

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);

    if (msg.type === "cancel" && activeProcess) {
      activeProcess.kill("SIGINT");
      activeProcess = null;
      ws.send(JSON.stringify({ type: "done" }));
      return;
    }

    if (msg.type === "prompt") {
      // Kill any existing process
      if (activeProcess) {
        activeProcess.kill("SIGINT");
        activeProcess = null;
      }

      const args = [
        "-p",
        msg.prompt,
        "--output-format",
        "stream-json",
        "--verbose",
      ];

      // Add system prompt if provided
      if (msg.systemPrompt) {
        args.push("--system-prompt", msg.systemPrompt);
      }

      // Resume session if provided
      if (msg.sessionId) {
        args.push("--resume", msg.sessionId);
      }

      console.log(`Spawning claude: ${msg.prompt.slice(0, 50)}...`);

      const proc = spawn("claude", args, {
        env: { ...process.env, FORCE_COLOR: "0", PATH: process.env.PATH },
        stdio: ["pipe", "pipe", "pipe"],
      });

      activeProcess = proc;
      proc.stdin.end();

      let buffer = "";

      proc.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        console.log(`[stdout] ${text.slice(0, 100)}...`);
        buffer += text;
        // stream-json outputs one JSON object per line
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            ws.send(JSON.stringify(event));
          } catch {
            console.log(`[parse-fail] ${line.slice(0, 100)}`);
          }
        }
      });

      proc.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        console.log(`[stderr] ${text}`);
        if (
          text.includes("Error") ||
          text.includes("error") ||
          text.includes("failed")
        ) {
          ws.send(JSON.stringify({ type: "error", error: text }));
        }
      });

      proc.on("close", (code) => {
        // Flush remaining buffer
        if (buffer.trim()) {
          try {
            const event = JSON.parse(buffer);
            ws.send(JSON.stringify(event));
          } catch {
            // ignore
          }
        }
        ws.send(JSON.stringify({ type: "done", code }));
        activeProcess = null;
      });

      proc.on("error", (err) => {
        ws.send(
          JSON.stringify({ type: "error", error: err.message })
        );
        activeProcess = null;
      });
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    if (activeProcess) {
      activeProcess.kill("SIGINT");
      activeProcess = null;
    }
  });
});

const PORT = process.env.PORT || 3456;
server.listen(PORT, () => {
  console.log(`Claude Chat spike running at http://localhost:${PORT}`);
});
