import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { encodeChatToken, ChatTokenConstants } from "@/lib/chat-token";
import { getTeamBySlug } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

interface Params {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/v1/teams/:slug/chat/token
 * Issue a short-lived WebSocket auth token for team chat.
 * Server validates login + team membership before issuing claims.
 */
export async function POST(_request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const { slug: rawSlug } = await params;
  const slugParse = z.string().min(1).safeParse(rawSlug);
  if (!slugParse.success) return apiError({ code: "INVALID_SLUG", message: "Invalid team slug" }, 400);
  const slug = slugParse.data;
  const team = await getTeamBySlug(slug, session.userId);
  if (!team) {
    return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
  }
  const isMember = team.members.some((m) => m.userId === session.userId);
  if (!isMember) {
    return apiError({ code: "FORBIDDEN", message: "Team members only" }, 403);
  }

  const token = encodeChatToken({
    teamSlug: slug,
    userId: session.userId,
    userName: session.name,
  });

  return apiSuccess({
    token,
    expiresInSeconds: ChatTokenConstants.CHAT_TOKEN_TTL_SECONDS,
    teamSlug: slug,
  });
}
