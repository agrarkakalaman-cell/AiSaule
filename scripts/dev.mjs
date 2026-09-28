import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const vinextCli = fileURLToPath(new URL("../node_modules/vinext/dist/cli.js", import.meta.url));
const pythonCommand = process.platform === "win32" ? "python" : "python3";
const children = [];
let stopping = false;

function start(command, args, label) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  children.push(child);
  child.on("error", (error) => {
    console.error(`[${label}] іске қосылмады: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`[${label}] тоқтады${signal ? ` (${signal})` : ` (code ${code ?? 0})`}.`);
      stop(code ?? 1);
    }
  });
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(exitCode), 150);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

console.log("Ai.Saule frontend: http://localhost:3001");
console.log("Ai.Saule backend:  http://127.0.0.1:8001");

start(pythonCommand, ["-m", "uvicorn", "backend.app:app", "--host", "127.0.0.1", "--port", "8001"], "backend");
start(process.execPath, [vinextCli, "dev", "--port", "3001"], "frontend");
