/**
 * VibeHub Team Chat — WebSocket Server
 *
 * Standalone process on port 3001 (configurable via WS_PORT env var).
 * Runs alongside the Next.js app (port 3000).
 *
 * Protocol:
 *  Client → Server:  { type: "auth",    token: string }
 *  Client → Server:  { type: "message", body: string }
 *  Server → Client:  { type: "message", id: string, teamSlug: string, userId: string,
 *                       userName: string, body: string, createdAt: string }
 *  Server → Client:  { type: "presence", count: number }
 *  Server → Client:  { type: "error",   code: string, message: string }
 *  Server → Client:  { type: "history", messages: ChatMessage[] }
 *
 * Persistence:
 *  Every message is persisted to DB via the Next.js REST endpoint
 *  POST /api/v1/teams/:slug/chat/messages before fan-out.
 *  On connection, history is fetched from the REST endpoint (DB-backed) instead of
 *  relying only on in-memory history, ensuring messages survive restarts.
 *
 * Retention: 30 days (CHAT_RETAIN_DAYS env in the Next.js process).
 *
 * Capacity: Each team room is capped at CHAT_CAPACITY_DEFAULT (50) concurrent
 * connections. The cap is overridable per-team via CHAT_CAPACITY_<TEAM_SLUG_UPPER>.
 */

import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { createServer } from "http";
import { verifyChatToken, type ChatTokenErrorCode } from "./src/lib/chat-token";

// ─── Configuration ────────────────────────────────────────────────────────────

const WS_PORT           = parseInt(process.env.WS_PORT           ?? "3001",  10);
const CHAT_CAPACITY_DEFAULT = parseInt(process.env.CHAT_CAPACITY_DEFAULT ?? "50", 10);
const MESSAGE_MAX_BYTES = 2000;
const HISTORY_LIMIT     = 50;
// Internal base URL used for REST persistence calls (Next.js app)
const NEXT_BASE_URL     = process.env.NEXT_BASE_URL ?? "http://localhost:3000";
// Optional server-to-server token (set both here and on the Next.js side via WS_SERVER_TOKEN)
const WS_SERVER_TOKEN   = process.env.WS_SERVER_TOKEN ?? "";
const IS_PRODUCTION     = process.env.NODE_ENV === "production";

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

interface TeamMemberVerifierResult {
  ok: boolean;
  code?: "TEAM_NOT_FOUND" | "FORBIDDEN";
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

/**
 * Persist a chat message to DB via the Next.js REST API (fire-and-forget).
 * Uses a trusted server-to-server pattern: the WS server forwards the
 * authenticated userId from verified chat token claims, and the Next.js
 * endpoint still enforces team membership server-side.
 */
async function persistMessage(teamSlug: string, userId: string, userName: string, body: string): Promise<ChatMessage | null> {
  if (!WS_SERVER_TOKEN) {
    if (IS_PRODUCTION) return null;
    return null;
  }

  const url = `${NEXT_BASE_URL}/api/v1/teams/${encodeURIComponent(teamSlug)}/chat/messages`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Internal header — the REST endpoint accepts this when WS_SERVER_TOKEN matches
    "x-ws-server-userId": userId,
  };
  headers["x-ws-server-token"] = WS_SERVER_TOKEN;

  try {
    const res = await fetch(url, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ body }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const created = json?.data;
    if (!created?.id || !created?.createdAt) return null;
    return {
      id: created.id as string,
      teamSlug,
      userId,
      userName,
      body: created.body as string,
      createdAt: created.createdAt as string,
    };
  } catch {
    return null;
  }
}

function sendPersistenceError(ws: WebSocket) {
  sendJson(ws, {
    type: "error",
    code: "CHAT_PERSIST_FAILED",
    message: "Message could not be saved. Please retry.",
  });
}

async function postMessageAndBroadcast(client: AuthedClient, body: string) {
  const persisted = await persistMessage(client.teamSlug, client.userId, client.userName, body);
  if (!persisted) {
    sendPersistenceError(client.ws);
    return;
  }

  addToHistory(client.teamSlug, persisted);

  // Echo to sender + broadcast to room after persistence.
  sendJson(client.ws, { type: "message", ...persisted });
  broadcastMessage(client.teamSlug, persisted, client.ws);
}

function postHistoryFallback(ws: WebSocket, teamSlug: string) {
  const hist = history.get(teamSlug) ?? [];
  sendJson(ws, { type: "history", messages: hist });
}

function fetchDbHistoryOrFallback(teamSlug: string, userId: string, ws: WebSocket) {
  fetchDbHistory(teamSlug, userId).then((dbHist) => {
    if (dbHist.length > 0) {
      // Replace in-memory history with authoritative DB snapshot
      history.set(teamSlug, dbHist.slice(-HISTORY_LIMIT));
      sendJson(ws, { type: "history", messages: dbHist });
      return;
    }
    postHistoryFallback(ws, teamSlug);
  });
}

function requireWsServerTokenOrWarn() {
  if (!WS_SERVER_TOKEN) {
    const msg =
      "[ws-server] WS_SERVER_TOKEN is not configured; websocket persistence and membership verification will fail.";
    if (IS_PRODUCTION) {
      throw new Error(msg);
    }
    console.warn(msg);
  }
}

requireWsServerTokenOrWarn();

async function fetchWithWsAuth(url: string, userId: string): Promise<Response | null> {
  if (!WS_SERVER_TOKEN) return null;
  const headers: Record<string, string> = {
    "x-ws-server-userId": userId,
    "x-ws-server-token": WS_SERVER_TOKEN,
  };
  try {
    return await fetch(url, { headers });
  } catch {
    return null;
  }
}

/**
 * Fetch recent DB history for a team on first connection.
 * Falls back to in-memory history if the REST call fails.
 */
async function fetchDbHistory(teamSlug: string, userId: string): Promise<ChatMessage[]> {
  const url = `${NEXT_BASE_URL}/api/v1/teams/${encodeURIComponent(teamSlug)}/chat/messages?limit=${HISTORY_LIMIT}`;
  const res = await fetchWithWsAuth(url, userId);
  if (!res?.ok) return [];
  const json = await res.json().catch(() => null);
  const msgs: Array<{ id: string; authorId: string; authorName: string; body: string; createdAt: string }> =
    json?.data?.messages ?? [];
  return msgs.map((m) => ({
    id:        m.id,
    teamSlug,
    userId:    m.authorId,
    userName:  m.authorName,
    body:      m.body,
    createdAt: m.createdAt,
  }));
}

/**
 * Verify membership against the authoritative Next.js API before allowing
 * a websocket client into a room. This prevents stale/replayed tokens from
 * bypassing server-side team membership changes.
 */
async function verifyTeamMembership(teamSlug: string, userId: string): Promise<TeamMemberVerifierResult> {
  const url = `${NEXT_BASE_URL}/api/v1/teams/${encodeURIComponent(teamSlug)}/chat/messages?limit=1`;
  const res = await fetchWithWsAuth(url, userId);
  if (!res) return { ok: false };
  if (res.ok) return { ok: true };
  if (res.status === 404) return { ok: false, code: "TEAM_NOT_FOUND" };
  if (res.status === 403) return { ok: false, code: "FORBIDDEN" };
  return { ok: false };
}

/**
 * Persist a chat message to DB via the Next.js REST API.
 * Uses a trusted server-to-server pattern: the WS server forwards the
 * authenticated userId from verified chat token claims, and the Next.js
 * endpoint still enforces team membership server-side.
 */
function _deprecated_persistMessage_fire_and_forget(teamSlug: string, userId: string, body: string): void {
  const url = `${NEXT_BASE_URL}/api/v1/teams/${encodeURIComponent(teamSlug)}/chat/messages`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-ws-server-userId": userId,
  };
  if (WS_SERVER_TOKEN) headers["x-ws-server-token"] = WS_SERVER_TOKEN;
  fetch(url, {
    method:  "POST",
    headers,
    body:    JSON.stringify({ body }),
  }).catch((err) => {
    console.error("[ws-server] persist failed:", err.message);
  });
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

wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
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

      const token = (data.token as string | undefined)?.trim();
      const verification = verifyChatToken(token);
      if (!verification.ok) {
        const codeMap: Partial<Record<ChatTokenErrorCode, string>> = {
          TOKEN_EXPIRED: "TOKEN_EXPIRED",
          INVALID_SIGNATURE: "TOKEN_INVALID_SIGNATURE",
          INVALID_CLAIMS: "TOKEN_INVALID_CLAIMS",
          MALFORMED_TOKEN: "TOKEN_MALFORMED",
          MISSING_TOKEN: "TOKEN_MISSING",
        };
        sendJson(ws, {
          type: "error",
          code: codeMap[verification.code] ?? "INVALID_AUTH",
          message: "Valid auth token required",
        });
        ws.close(4002, "Invalid auth");
        return;
      }
      const claims = verification.claims;
      const teamSlug = claims.teamSlug;
      const userId = claims.userId;
      const userName = claims.userName;

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

      void verifyTeamMembership(teamSlug, userId).then((membership) => {
        if (!membership.ok) {
          const code =
            membership.code === "TEAM_NOT_FOUND"
              ? "TEAM_NOT_FOUND"
              : membership.code === "FORBIDDEN"
                ? "FORBIDDEN_MEMBER_REQUIRED"
                : "AUTH_VERIFICATION_FAILED";
          sendJson(ws, {
            type: "error",
            code,
            message: "Team membership verification failed",
          });
          ws.close(4004, "Membership verification failed");
          return;
        }

        clearTimeout(authTimeout);
        client = { ws, teamSlug, userId, userName };
        if (!rooms.has(teamSlug)) rooms.set(teamSlug, new Set());
        rooms.get(teamSlug)!.add(client);

        // Notify presence update immediately
        broadcastPresence(teamSlug);

        // Fetch DB history (async) then send; fall back to in-memory
        fetchDbHistoryOrFallback(teamSlug, userId, ws);
      });
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

      void postMessageAndBroadcast(client, body);
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
