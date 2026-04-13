/**
 * VibeHub Team Chat — WebSocket Server
 *
 * Standalone process on port 3001 (configurable via WS_PORT env var).
 * Runs alongside the Next.js app (port 3000).
 *
 * Protocol:
 *  Client → Server:  { type: "auth",    teamSlug: string, userId: string, userName: string }
 *  Client → Server:  { type: "message", body: string }
 *  Server → Client:  { type: "message", id: string, teamSlug: string, userId: string,
 *                       userName: string, body: string, createdAt: string }
 *  Server → Client:  { type: "presence", count: number }
 *  Server → Client:  { type: "error",   code: string, message: string }
 *  Server → Client:  { type: "history", messages: ChatMessage[] }
 *
 * Capacity: Each team room is capped at CHAT_CAPACITY_DEFAULT (50) concurrent
 * connections. The cap is overridable per-team via CHAT_CAPACITY_<TEAM_SLUG_UPPER>.
 */

import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

// ─── Configuration ────────────────────────────────────────────────────────────

const WS_PORT = parseInt(process.env.WS_PORT ?? "3001", 10);
const CHAT_CAPACITY_DEFAULT = parseInt(process.env.CHAT_CAPACITY_DEFAULT ?? "50", 10);
const MESSAGE_MAX_BYTES = 2000;
const HISTORY_LIMIT = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  teamSlug: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
}

interface AuthedClient {
  ws: WebSocket;
  teamSlug: string;
  userId: string;
  userName: string;
}

// ─── In-memory state ─────────────────────────────────────────────────────────
// rooms: teamSlug → Set of authed clients
const rooms = new Map<string, Set<AuthedClient>>();
// history: teamSlug → last HISTORY_LIMIT messages (ephemeral, resets on restart)
const history = new Map<string, ChatMessage[]>();

function getCapacity(teamSlug: string): number {
  const envKey = `CHAT_CAPACITY_${teamSlug.toUpperCase().replace(/-/g, "_")}`;
  const custom = process.env[envKey];
  if (custom) {
    const n = parseInt(custom, 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return CHAT_CAPACITY_DEFAULT;
}

function getRoomCount(teamSlug: string): number {
  return rooms.get(teamSlug)?.size ?? 0;
}

function broadcastPresence(teamSlug: string) {
  const count = getRoomCount(teamSlug);
  const msg = JSON.stringify({ type: "presence", count });
  rooms.get(teamSlug)?.forEach(({ ws }) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

function broadcastMessage(teamSlug: string, msg: ChatMessage, skip?: WebSocket) {
  const payload = JSON.stringify({ type: "message", ...msg });
  rooms.get(teamSlug)?.forEach(({ ws }) => {
    if (ws !== skip && ws.readyState === WebSocket.OPEN) ws.send(payload);
  });
}

function addToHistory(teamSlug: string, msg: ChatMessage) {
  if (!history.has(teamSlug)) history.set(teamSlug, []);
  const arr = history.get(teamSlug)!;
  arr.push(msg);
  if (arr.length > HISTORY_LIMIT) arr.shift();
}

function sendJson(ws: WebSocket, payload: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

// ─── Server ───────────────────────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "vibehub-ws" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws: WebSocket) => {
  let client: AuthedClient | null = null;

  // Authentication timeout — kick unauthenticated clients after 10 s
  const authTimeout = setTimeout(() => {
    if (!client) {
      sendJson(ws, { type: "error", code: "AUTH_TIMEOUT", message: "Authentication required" });
      ws.close(4001, "Auth timeout");
    }
  }, 10_000);

  ws.on("message", (raw) => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      sendJson(ws, { type: "error", code: "INVALID_JSON", message: "Malformed message" });
      return;
    }

    const msgType = data.type as string | undefined;

    // ── AUTH ──────────────────────────────────────────────────────────────────
    if (msgType === "auth") {
      if (client) {
        sendJson(ws, { type: "error", code: "ALREADY_AUTHED", message: "Already authenticated" });
        return;
      }

      const teamSlug = (data.teamSlug as string | undefined)?.trim();
      const userId   = (data.userId   as string | undefined)?.trim();
      const userName = (data.userName as string | undefined)?.trim() ?? "Anonymous";

      if (!teamSlug || !userId) {
        sendJson(ws, { type: "error", code: "INVALID_AUTH", message: "teamSlug and userId required" });
        ws.close(4002, "Invalid auth");
        return;
      }

      // Capacity check
      const cap = getCapacity(teamSlug);
      if (getRoomCount(teamSlug) >= cap) {
        sendJson(ws, {
          type:    "error",
          code:    "ROOM_FULL",
          message: `Team chat is at capacity (${cap} concurrent users). Try again later.`,
        });
        ws.close(4003, "Room full");
        return;
      }

      clearTimeout(authTimeout);

      client = { ws, teamSlug, userId, userName };
      if (!rooms.has(teamSlug)) rooms.set(teamSlug, new Set());
      rooms.get(teamSlug)!.add(client);

      // Send history
      const hist = history.get(teamSlug) ?? [];
      sendJson(ws, { type: "history", messages: hist });

      // Notify all presence update
      broadcastPresence(teamSlug);
      return;
    }

    // ── MESSAGE ───────────────────────────────────────────────────────────────
    if (msgType === "message") {
      if (!client) {
        sendJson(ws, { type: "error", code: "NOT_AUTHED", message: "Authenticate first" });
        return;
      }

      const body = (data.body as string | undefined)?.trim();
      if (!body) {
        sendJson(ws, { type: "error", code: "EMPTY_MESSAGE", message: "Message body is required" });
        return;
      }
      if (Buffer.byteLength(body, "utf8") > MESSAGE_MAX_BYTES) {
        sendJson(ws, { type: "error", code: "MESSAGE_TOO_LONG", message: `Max ${MESSAGE_MAX_BYTES} bytes` });
        return;
      }

      const msg: ChatMessage = {
        id:        `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        teamSlug:  client.teamSlug,
        userId:    client.userId,
        userName:  client.userName,
        body,
        createdAt: new Date().toISOString(),
      };

      addToHistory(client.teamSlug, msg);

      // Echo to sender + broadcast
      sendJson(ws, { type: "message", ...msg });
      broadcastMessage(client.teamSlug, msg, ws);
      return;
    }

    sendJson(ws, { type: "error", code: "UNKNOWN_TYPE", message: `Unknown message type: ${msgType}` });
  });

  ws.on("close", () => {
    clearTimeout(authTimeout);
    if (client) {
      rooms.get(client.teamSlug)?.delete(client);
      if (rooms.get(client.teamSlug)?.size === 0) {
        rooms.delete(client.teamSlug);
      }
      broadcastPresence(client.teamSlug);
    }
  });

  ws.on("error", (err) => {
    console.error("[ws-server] socket error:", err.message);
  });
});

httpServer.listen(WS_PORT, () => {
  console.log(`[ws-server] Listening on port ${WS_PORT}`);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal: string) {
  console.log(`[ws-server] ${signal} received — closing`);
  wss.close(() => {
    httpServer.close(() => process.exit(0));
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
