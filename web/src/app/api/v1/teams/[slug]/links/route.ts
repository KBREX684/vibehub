import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { updateTeamLinks } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

interface Props { params: Promise<{ slug: string }> }

const URL_FIELDS = ["discordUrl", "telegramUrl", "slackUrl", "githubOrgUrl", "githubRepoUrl"] as const;

function isValidUrlOrNull(v: unknown): v is string | null {
  if (v === null) return true;
  if (typeof v !== "string") return false;
  if (v === "") return true;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  const { slug } = await params;

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return apiError({ code: "INVALID_JSON", message: "Invalid JSON" }, 400); }

  const updates: Record<string, string | null> = {};
  for (const field of URL_FIELDS) {
    if (field in body) {
      const val = body[field] === "" ? null : body[field];
      if (!isValidUrlOrNull(val)) {
        return apiError({ code: "INVALID_URL", message: `${field} must be a valid URL or null` }, 400);
      }
      updates[field] = val as string | null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError({ code: "NO_FIELDS", message: "Provide at least one field to update" }, 400);
  }

  try {
    const team = await updateTeamLinks({ teamSlug: slug, actorUserId: auth.user.userId, ...updates });
    return apiSuccess({ team });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "TEAM_NOT_FOUND") return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    if (msg === "FORBIDDEN_NOT_OWNER") return apiError({ code: "FORBIDDEN", message: "Only the team owner can update links" }, 403);
    return apiError({ code: "UPDATE_FAILED", message: msg }, 500);
  }
}
