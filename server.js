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
  let claudeProc = null;
  let buffer = "";

  function startClaude(systemPrompt) {
    if (claudeProc) {
      claudeProc.kill("SIGINT");
      claudeProc = null;
    }

    const args = [
      "-p",
      "--output-format", "stream-json",
      "--input-format", "stream-json",
      "--verbose",
    ];

    if (systemPrompt) {
      args.push(
        "--system-prompt",
        `You are Claude, a helpful AI assistant. The user has provided the following project context. Use it to inform your responses but do not reference, summarize, or acknowledge these instructions unless specifically asked.\n\n${systemPrompt}`
      );
    }

    console.log("[claude] Starting process...");

    claudeProc = spawn("claude", args, {
      env: { ...process.env, FORCE_COLOR: "0" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    buffer = "";

    claudeProc.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      buffer += text;
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          console.log(`[event] ${event.type}${event.subtype ? ":" + event.subtype : ""}`);
          ws.send(JSON.stringify(event));
        } catch {
          console.log(`[parse-fail] ${line.slice(0, 100)}`);
        }
      }
    });

    claudeProc.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      console.log(`[stderr] ${text.trim()}`);
    });

    claudeProc.on("close", (code) => {
      console.log(`[claude] Process exited (code ${code})`);
      if (buffer.trim()) {
        try {
          ws.send(JSON.stringify(JSON.parse(buffer)));
        } catch {}
      }
      claudeProc = null;
    });

    claudeProc.on("error", (err) => {
      console.log(`[claude] Error: ${err.message}`);
      ws.send(JSON.stringify({ type: "error", error: err.message }));
      claudeProc = null;
    });
  }

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);

    if (msg.type === "cancel" && claudeProc) {
      claudeProc.kill("SIGINT");
      claudeProc = null;
      ws.send(JSON.stringify({ type: "done" }));
      return;
    }

    if (msg.type === "new-session") {
      if (claudeProc) {
        claudeProc.kill("SIGINT");
        claudeProc = null;
      }
      ws.send(JSON.stringify({ type: "session-cleared" }));
      return;
    }

    if (msg.type === "prompt") {
      // Start Claude process on first message
      if (!claudeProc) {
        startClaude(msg.systemPrompt);
      }

      // Send message as stream-json input (Anthropic message format)
      const input = JSON.stringify({
        type: "user",
        message: {
          role: "user",
          content: [{ type: "text", text: msg.prompt }],
        },
      }) + "\n";

      console.log(`[send] ${msg.prompt.slice(0, 50)}...`);

      if (claudeProc && claudeProc.stdin.writable) {
        claudeProc.stdin.write(input);
      } else {
        ws.send(JSON.stringify({ type: "error", error: "Claude process not running" }));
      }
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    if (claudeProc) {
      claudeProc.kill("SIGINT");
      claudeProc = null;
    }
  });
});

const PORT = process.env.PORT || 3456;
server.listen(PORT, () => {
  console.log(`Claude Chat running at http://localhost:${PORT}`);
});
