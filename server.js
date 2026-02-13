import express from "express";
import { WebSocketServer } from "ws";
import { spawn } from "child_process";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Projects live here
const PROJECTS_DIR = join(__dirname, "projects");
mkdirSync(PROJECTS_DIR, { recursive: true });

// Create a default project if none exist
const defaultProject = join(PROJECTS_DIR, "general");
if (!existsSync(defaultProject)) {
  mkdirSync(defaultProject, { recursive: true });
  writeFileSync(join(defaultProject, "CLAUDE.md"), "# General\n\nGeneral-purpose assistant. No specific project context.\n");
}

app.use(express.static(join(__dirname, "public")));

// API: list projects
app.get("/api/projects", (req, res) => {
  const projects = readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const claudeMd = join(PROJECTS_DIR, d.name, "CLAUDE.md");
      const hasContext = existsSync(claudeMd);
      return {
        id: d.name,
        name: d.name,
        hasContext,
      };
    });
  res.json(projects);
});

// API: get project CLAUDE.md
app.get("/api/projects/:id/context", (req, res) => {
  const claudeMd = join(PROJECTS_DIR, req.params.id, "CLAUDE.md");
  if (existsSync(claudeMd)) {
    res.json({ content: readFileSync(claudeMd, "utf-8") });
  } else {
    res.json({ content: "" });
  }
});

wss.on("connection", (ws) => {
  console.log("Client connected");
  let claudeProc = null;
  let buffer = "";

  function startClaude(projectId) {
    if (claudeProc) {
      claudeProc.kill("SIGINT");
      claudeProc = null;
    }

    const projectDir = join(PROJECTS_DIR, projectId);
    if (!existsSync(projectDir)) {
      ws.send(JSON.stringify({ type: "error", error: `Project "${projectId}" not found` }));
      return;
    }

    const args = [
      "-p",
      "--output-format", "stream-json",
      "--input-format", "stream-json",
      "--verbose",
    ];

    console.log(`[claude] Starting in project: ${projectId}`);

    claudeProc = spawn("claude", args, {
      cwd: projectDir,
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
          // skip
        }
      }
    });

    claudeProc.stderr.on("data", (chunk) => {
      console.log(`[stderr] ${chunk.toString().trim()}`);
    });

    claudeProc.on("close", (code) => {
      console.log(`[claude] Process exited (code ${code})`);
      if (buffer.trim()) {
        try { ws.send(JSON.stringify(JSON.parse(buffer))); } catch {}
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
      // Start Claude in project directory on first message
      if (!claudeProc) {
        startClaude(msg.projectId || "general");
      }

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
  console.log(`Projects directory: ${PROJECTS_DIR}`);
});
