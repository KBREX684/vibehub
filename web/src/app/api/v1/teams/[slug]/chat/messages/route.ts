/**
 * GET  /api/v1/teams/:slug/chat/messages
 *   Returns the last N chat messages within the 30-day retention window.
 *   Authentication: team member (session or API key with read:team:detail).
 *
 * POST /api/v1/teams/:slug/chat/messages
 *   Persist a chat message (REST fallback for clients that cannot use WebSocket).
 *   Authentication: team member (session required).
 *
 * DELETE /api/v1/teams/:slug/chat/messages
 *   Admin-only: purge all messages older than 30 days for this team (or platform-wide).
 *   Also auto-triggered on GET requests to keep the dataset pruned.
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/response";
import { getSessionUserFromCookie, authenticateRequest, resolveReadAuth } from "@/lib/auth";
import {
  getTeamBySlug,
  listTeamChatMessages,
  createTeamChatMessage,
  pruneOldTeamChatMessages,
  chatRetentionCutoff,
} from "@/lib/repository";

interface Params {
  params: Promise<{ slug: string }>;
}

const postSchema = z.object({
  body: z.string().min(1).max(2000),
});

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  // Auth: session user or API-key holder with read:team:detail
  const auth = await authenticateRequest(req, "read:team:detail");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    return apiError({ code: "UNAUTHORIZED", message: "Authentication required" }, 401);
  }

  try {
    const team = await getTeamBySlug(slug, gate.user?.userId ?? null);
    if (!team) {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }

    // Verify viewer membership (chat is members-only)
    const serverToken = process.env.WS_SERVER_TOKEN ?? "";
    const isWsServer  = serverToken && req.headers.get("x-ws-server-token") === serverToken;
    const viewerId    = isWsServer ? req.headers.get("x-ws-server-userId") : gate.user?.userId;
    if (!viewerId) {
      return apiError({ code: "UNAUTHORIZED", message: "Authentication required" }, 401);
    }
    const isMember = team.members.some((m) => m.userId === viewerId);
    if (!isMember) {
      return apiError({ code: "FORBIDDEN", message: "Team members only" }, 403);
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

    // Background prune (fire-and-forget, non-blocking)
    pruneOldTeamChatMessages().catch(() => {});

    const messages = await listTeamChatMessages({ teamSlug: slug, limit });

    return apiSuccess({
      messages,
      retainedSince: chatRetentionCutoff().toISOString(),
    });
  } catch (err) {
    return apiError(
      {
        code: "CHAT_FETCH_FAILED",
        message: "Failed to fetch chat messages",
        details: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

/** Resolve acting userId: either from session cookie or trusted WS-server header. */
async function resolveActorUserId(req: NextRequest): Promise<string | null> {
  const session = await getSessionUserFromCookie();
  if (session) return session.userId;

  // Internal WS-server trust header (only when server token matches)
  const serverToken = process.env.WS_SERVER_TOKEN ?? "";
  if (serverToken) {
    const reqToken  = req.headers.get("x-ws-server-token");
    const reqUserId = req.headers.get("x-ws-server-userId");
    if (reqToken === serverToken && reqUserId) return reqUserId;
  }
  return null;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const actorId = await resolveActorUserId(req);
  if (!actorId) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const userId  = actorId;

  try {
    const team = await getTeamBySlug(slug, userId);
    if (!team) {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }

    // Membership is always required, including WS-server internal calls.
    const isMember = team.members.some((m) => m.userId === userId);
    if (!isMember) {
      return apiError({ code: "FORBIDDEN", message: "Team members only" }, 403);
    }

    const json = await req.json();
    const { body } = postSchema.parse(json);

    const msg = await createTeamChatMessage({
      teamSlug: slug,
      authorId: userId,
      body,
    });

    return apiSuccess(msg, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "INVALID_BODY") {
      return apiError({ code: "INVALID_BODY", message: "Message body is empty or too long" }, 400);
    }
    return apiError(
      {
        code: "CHAT_POST_FAILED",
        message: "Failed to post chat message",
        details: msg,
      },
      400
    );
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function DELETE() {
  const session = await getSessionUserFromCookie();
  if (!session || session.role !== "admin") {
    return apiError({ code: "FORBIDDEN", message: "Admin only" }, 403);
  }

  try {
    const deleted = await pruneOldTeamChatMessages();
    return apiSuccess({ deleted });
  } catch (err) {
    return apiError(
      {
        code: "PRUNE_FAILED",
        message: "Failed to prune chat messages",
        details: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
}
