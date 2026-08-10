import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { WebSocketServer } from "ws";

const dev = process.env.NODE_ENV === "development";
const port = Number(process.env.PORT || 3000);
const wsPath = process.env.WS_PATH || "/ws";

const app = next({ dev });
await app.prepare();

const handle = app.getRequestHandler();

const server = createServer((req, res) => {
  handle(req, res);
});

const wss = new WebSocketServer({ noServer: true });

/** Active connections, each tagged with an optional identity. */
const clients = new Map(); // ws -> { id, name }

function broadcast(json, exclude) {
  const data = JSON.stringify(json);
  for (const ws of wss.clients) {
    if (ws === exclude) continue;
    if (ws.readyState !== ws.OPEN) continue;
    ws.send(data);
  }
}

function presenceList() {
  return [...clients.values()].map((c) => ({ id: c.id, name: c.name }));
}

wss.on("connection", (ws) => {
  clients.set(ws, { id: null, name: null });

  ws.send(JSON.stringify({ type: "presence", online: presenceList() }));

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    switch (msg.type) {
      case "join": {
        const meta = clients.get(ws) || {};
        meta.id = String(msg.id || meta.id || `p${Math.random().toString(36).slice(2, 7)}`);
        meta.name = String(msg.name || "Someone").slice(0, 30);
        clients.set(ws, meta);
        notifyPresence();
        break;
      }
      case "typing": {
        const meta = clients.get(ws);
        broadcast({ type: "typing", conversationId: msg.conversationId, name: meta?.name, on: !!msg.on }, ws);
        break;
      }
      case "sync": {
        broadcast({ type: "sync", conversationId: msg.conversationId, message: msg.message, title: msg.title }, ws);
        break;
      }
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    notifyPresence();
  });
});

function notifyPresence() {
  const list = presenceList();
  broadcast({ type: "presence", online: list });
}

server.on("upgrade", (req, socket, head) => {
  const { pathname } = parse(req.url || "", true);
  if (pathname === wsPath || pathname === `${wsPath}/`) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  } else {
    socket.destroy();
  }
});

server.listen(port, () => {
  console.log(`\n  Milo is listening on http://localhost:${port}`);
  console.log(`  WebSocket realtime server on ws://localhost:${port}${wsPath}\n`);
});