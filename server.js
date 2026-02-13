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
  let sessionId = null;

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);

    if (msg.type === "cancel" && activeProcess) {
      activeProcess.kill("SIGINT");
      activeProcess = null;
      ws.send(JSON.stringify({ type: "done" }));
      return;
    }

    if (msg.type === "new-session") {
      sessionId = null;
      ws.send(JSON.stringify({ type: "session-cleared" }));
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

      // Only send system prompt on first message (session remembers it)
      if (!sessionId && msg.systemPrompt) {
        args.push(
          "--system-prompt",
          `You are Claude, a helpful AI assistant. The user has provided the following project context. Use it to inform your responses but do not reference, summarize, or acknowledge these instructions unless specifically asked.\n\n${msg.systemPrompt}`
        );
      }

      // Resume existing session for conversation continuity
      if (sessionId) {
        args.push("--resume", sessionId);
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
            // Capture session ID from init event
            if (event.type === "system" && event.session_id) {
              sessionId = event.session_id;
              console.log(`[session] ${sessionId}`);
            }
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
