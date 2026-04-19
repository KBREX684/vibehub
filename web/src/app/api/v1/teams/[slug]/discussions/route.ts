import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { createTeamDiscussion, listTeamDiscussions } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { safeServerErrorDetails } from "@/lib/safe-error-details";
import {
  deprecatedResponse,
  isV11BackendLockdownEnabled,
  withDeprecatedHeaders,
} from "@/lib/v11-deprecation";

const bodySchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(4000),
});

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "read:team:detail");
  const gate = resolveReadAuth(auth, false);
  if (!gate.ok) {
    if (gate.status === 429) return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key required" }, 401);
  }

  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const result = await listTeamDiscussions({
      teamSlug: slug,
      viewerUserId: gate.user!.userId,
      page,
      limit,
    });
    return withDeprecatedHeaders(apiSuccess(result));
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    return apiError(
      {
        code: "TEAM_DISCUSSIONS_LIST_FAILED",
        message: "Failed to list team discussions",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  if (isV11BackendLockdownEnabled()) {
    return deprecatedResponse("TEAMS_DEPRECATED");
  }
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  try {
    const { slug } = await params;
    const parsed = bodySchema.parse(await request.json());
    const discussion = await createTeamDiscussion({
      teamSlug: slug,
      actorUserId: auth.user.userId,
      title: parsed.title,
      body: parsed.body,
    });
    return apiSuccess({ discussion }, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    return apiError(
      {
        code: "TEAM_DISCUSSION_CREATE_FAILED",
        message: "Failed to create team discussion",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
