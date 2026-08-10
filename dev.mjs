import { spawn } from "node:child_process";

const port = process.env.PORT || "3000";
const wsPort = process.env.WS_PORT || "3001";

function runNext() {
  return spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "-p", port],
    { stdio: "inherit", env: { ...process.env } }
  );
}

function runWs() {
  return spawn(process.execPath, ["ws-server.mjs"], {
    stdio: "inherit",
    env: { ...process.env, WS_PORT: wsPort },
  });
}

const nextDev = runNext();
let wsSrv = runWs();

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    nextDev.kill();
  } catch {}
  try {
    wsSrv.kill();
  } catch {}
  setTimeout(() => process.exit(code), 800);
}

nextDev.on("error", (err) => {
  console.error("Failed to start next dev:", err);
  shutdown(1);
});
wsSrv.on("error", (err) => {
  console.error("Failed to start the WebSocket server:", err);
  shutdown(1);
});

nextDev.on("exit", (code) => shutdown(code ?? 0));
wsSrv.on("exit", (code) => {
  if (code === 1) shutdown(code);
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));