"use client";

/**
 * TeamChatPanel
 *
 * Real-time team chat via WebSocket (ws-server on port 3001).
 * Falls back to REST polling if WebSocket is unavailable.
 *
 * Features:
 * - Live message delivery via WebSocket
 * - Message history from REST (30-day retention window)
 * - Online presence counter
 * - Per-team capacity enforcement (server-side)
 * - Auto-scroll to latest message
 * - Dark-theme UI consistent with VibeHub v2 design system
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Wifi, WifiOff, Users, MessageSquare, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMsg {
  id: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
  /** true for optimistic/sent-by-self before echo */
  pending?: boolean;
}

type ConnState = "connecting" | "connected" | "disconnected" | "error" | "full";
type HistoryState = "idle" | "loading" | "loaded" | "error";

interface Props {
  teamSlug: string;
  /** Logged-in user. Pass null to show login prompt. */
  currentUser: { id: string; name: string } | null;
  /** UI pre-check only; server auth token + membership is authoritative. */
  isMember: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resolved at connect time so SSR never pins the browser hostname to localhost. */
function getTeamChatWsUrl(): string {
  const fromEnv = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_WS_URL?.trim() : "";
  if (fromEnv) return fromEnv;
  const { protocol, hostname, host, port } = window.location;
  const wsProto = protocol === "https:" ? "wss:" : "ws:";
  // Reverse proxy on 80/443: nginx forwards `/ws` to ws-server
  if (!port || port === "80" || port === "443") {
    return `${wsProto}//${host}/ws`;
  }
  // Local dev: Next.js on 3000, ws-server on 3001
  return `${wsProto}//${hostname}:3001/ws`;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function nanoid() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TeamChatPanel({ teamSlug, currentUser, isMember }: Props) {
  const [messages, setMessages]       = useState<ChatMsg[]>([]);
  const [input, setInput]             = useState("");
  const [connState, setConnState]     = useState<ConnState>("disconnected");
  const [historyState, setHistoryState] = useState<HistoryState>("idle");
  const [usingRestFallback, setUsingRestFallback] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const wsRef        = useRef<WebSocket | null>(null);
  const authTokenRef = useRef<string | null>(null);
  const bottomRef    = useRef<HTMLDivElement | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef   = useRef(true);
  const stopReconnectRef = useRef(false);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load REST history on mount
  const loadHistory = useCallback(async () => {
    if (!isMember || !currentUser) return;
    setHistoryState("loading");
    try {
      const res = await apiFetch(`/api/v1/teams/${teamSlug}/chat/messages?limit=50`);
      if (!res.ok) {
        if (mountedRef.current) {
          setHistoryState("error");
          setError("Failed to load chat history");
        }
        return;
      }
      const data = await res.json();
      const hist: ChatMsg[] = (data.data?.messages ?? []).map(
        (m: { id: string; authorId: string; authorName: string; body: string; createdAt: string }) => ({
          id:        m.id,
          userId:    m.authorId,
          userName:  m.authorName,
          body:      m.body,
          createdAt: m.createdAt,
        })
      );
      if (mountedRef.current) {
        setMessages(hist);
        setHistoryState("loaded");
      }
    } catch {
      if (mountedRef.current) {
        setHistoryState("error");
        setError("Unable to load chat history");
      }
    }
  }, [teamSlug, isMember, currentUser]);

  // WebSocket connection
  const connect = useCallback(async () => {
    if (!isMember || !currentUser) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    stopReconnectRef.current = false;
    setUsingRestFallback(false);
    setConnState("connecting");
    setError(null);

    try {
      const tokenRes = await apiFetch(`/api/v1/teams/${teamSlug}/chat/token`, { method: "POST" });
      if (!tokenRes.ok) {
        const payload = await tokenRes.json().catch(() => null);
        setConnState("error");
        setError(payload?.error?.message ?? "Failed to authorize team chat");
        return;
      }
      const tokenJson = await tokenRes.json();
      const token = tokenJson?.data?.token as string | undefined;
      if (!token) {
        setConnState("error");
        setError("Missing chat auth token");
        return;
      }
      authTokenRef.current = token;
    } catch {
      setConnState("error");
      setUsingRestFallback(true);
      setError("Unable to authorize chat connection");
      return;
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(getTeamChatWsUrl());
    } catch {
      setConnState("error");
      setUsingRestFallback(true);
      setError("WebSocket not available");
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      setConnState("connected");
      setUsingRestFallback(false);
      ws.send(
        JSON.stringify({
          type:  "auth",
          token: authTokenRef.current,
        })
      );
    };

    ws.onmessage = (event) => {
      let data: Record<string, unknown>;
      try { data = JSON.parse(event.data); } catch { return; }

      if (data.type === "history") {
        const hist: ChatMsg[] = ((data.messages as ChatMsg[]) ?? []).map((m) => ({
          id:        m.id,
          userId:    m.userId,
          userName:  m.userName,
          body:      m.body,
          createdAt: m.createdAt,
        }));
        if (mountedRef.current) setMessages(hist);
      } else if (data.type === "message") {
        const incoming: ChatMsg = {
          id:        data.id as string,
          userId:    data.userId as string,
          userName:  data.userName as string,
          body:      data.body as string,
          createdAt: data.createdAt as string,
        };
        if (mountedRef.current) {
          setMessages((prev) => {
            // Replace optimistic if same content from self
            const dedupe = prev.filter(
              (m) =>
                !(
                  m.pending &&
                  m.userId === incoming.userId &&
                  m.body === incoming.body
                )
            );
            return [...dedupe, incoming];
          });
        }
      } else if (data.type === "presence") {
        if (mountedRef.current) setOnlineCount(data.count as number);
      } else if (data.type === "error") {
        const code = data.code as string;
        if (code === "ROOM_FULL") {
          if (mountedRef.current) setConnState("full");
          stopReconnectRef.current = true;
          ws.close();
        } else if (mountedRef.current) {
          setError(data.message as string);
        }
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      if (!stopReconnectRef.current) {
        setConnState("disconnected");
        setUsingRestFallback(true);
        setOnlineCount(null);
        // Reconnect after 5 s
        reconnectRef.current = setTimeout(() => {
          if (mountedRef.current && !stopReconnectRef.current) connect();
        }, 5000);
      }
    };

    ws.onerror = () => {
      if (mountedRef.current) {
        setConnState("error");
        setUsingRestFallback(true);
        setError("Connection error. Retrying…");
      }
    };
  }, [teamSlug, currentUser, isMember]);

  useEffect(() => {
    mountedRef.current = true;
    stopReconnectRef.current = false;
    setMessages([]);
    setHistoryState("idle");
    loadHistory();
    connect();
    return () => {
      mountedRef.current = false;
      stopReconnectRef.current = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [teamSlug, isMember, currentUser?.id, loadHistory, connect]);

  const sendMessage = () => {
    const body = input.trim();
    if (!body || !currentUser) return;

    // Optimistic update
    const optimistic: ChatMsg = {
      id:        nanoid(),
      userId:    currentUser.id,
      userName:  currentUser.name,
      body,
      createdAt: new Date().toISOString(),
      pending:   true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", body }));
    } else {
      // REST fallback
      setUsingRestFallback(true);
      fetch(`/api/v1/teams/${teamSlug}/chat/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ body }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("send failed");
          const data = await res.json();
          if (mountedRef.current) {
            setMessages((prev) =>
              prev.map((m) => (m.id === optimistic.id ? { ...data.data, pending: false } : m))
            );
          }
        })
        .catch(() => {
          if (mountedRef.current) {
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setError("Failed to send message");
          }
        });
    }
  };

  // ── Render guards ──────────────────────────────────────────────────────────

  if (!currentUser) {
    return (
      <div className="card p-8 text-center">
        <Lock className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-3 opacity-60" />
        <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Team Chat</p>
        <p className="text-xs text-[var(--color-text-secondary)]">Sign in to access the team chat.</p>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="card p-8 text-center">
        <Lock className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-3 opacity-60" />
        <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Team Chat</p>
        <p className="text-xs text-[var(--color-text-secondary)]">Join this team to participate in the chat.</p>
      </div>
    );
  }

  if (connState === "full") {
    return (
      <div className="card p-8 text-center">
        <Users className="w-8 h-8 text-[var(--color-warning)] mx-auto mb-3" />
        <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Chat at capacity</p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          The chat room is full. Please try again later.
        </p>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="card flex flex-col overflow-hidden" style={{ minHeight: 400, maxHeight: 560 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Team Chat</span>
          {onlineCount !== null && (
            <span className="tag tag-green text-xs">{onlineCount} online</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {connState === "connected" ? (
            <span className="flex items-center gap-1 text-xs text-[var(--color-success)]">
              <Wifi className="w-3.5 h-3.5" />
              Live
            </span>
          ) : connState === "connecting" ? (
            <span className="flex items-center gap-1 text-xs text-[var(--color-warning)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] animate-pulse" />
              Connecting…
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <WifiOff className="w-3.5 h-3.5" />
              Offline
            </span>
          )}
        </div>
      </div>

      {usingRestFallback && (
        <div className="mx-4 mt-2 px-3 py-1.5 bg-[var(--color-warning-subtle)] border border-[rgba(251,191,36,0.25)] rounded-[var(--radius-md)] text-xs text-[var(--color-warning)]">
          Realtime chat unavailable. Sending via REST fallback.
        </div>
      )}

      {/* Message list */}
      <div
        data-testid="team-chat-messages"
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5"
      >
        {historyState === "loading" ? (
          <div className="text-center py-8">
            <p className="text-xs text-[var(--color-text-muted)]">Loading recent messages…</p>
          </div>
        ) : historyState === "error" ? (
          <div className="text-center py-8">
            <p className="text-xs text-[var(--color-error)]">Failed to load chat history.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-[var(--color-text-muted)]">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.userId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] ${isSelf ? "items-end" : "items-start"} flex flex-col gap-0.5`}
                >
                  {!isSelf && (
                    <span className="text-xs font-medium text-[var(--color-text-secondary)] px-1">
                      {msg.userName}
                    </span>
                  )}
                  <div
                    className={`px-3 py-2 rounded-[var(--radius-lg)] text-sm leading-relaxed max-w-full break-words ${
                      isSelf
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
                    } ${msg.pending ? "opacity-60" : ""}`}
                  >
                    {msg.body}
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted)] px-1">
                    {formatTime(msg.createdAt)}
                    {msg.pending && " · sending…"}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error bar */}
      {error && (
        <div className="mx-4 mb-1 px-3 py-1.5 bg-[var(--color-error-subtle)] border border-[rgba(239,68,68,0.2)] rounded-[var(--radius-md)] text-xs text-[var(--color-error)]">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-[var(--color-border)]">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            maxLength={2000}
            className="input-base flex-1 text-sm py-2"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="btn btn-primary px-3 py-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
          Messages are retained for 30 days.
        </p>
      </div>
    </div>
  );
}
