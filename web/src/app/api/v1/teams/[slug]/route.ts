import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { getTeamBySlug, updateTeamProfile } from "@/lib/repository";
import { safeServerErrorDetails } from "@/lib/safe-error-details";
import { readJsonObjectBody } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { getRequestLogger, serializeError } from "@/lib/logger";
import {
  deprecatedResponse,
  isV11BackendLockdownEnabled,
  withDeprecatedHeaders,
} from "@/lib/v11-deprecation";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "read:team:detail");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError({ code: "UNAUTHORIZED", message: "API key with read:team:detail required" }, 401);
  }

  try {
    const { slug } = await params;
    const team = await getTeamBySlug(slug, gate.user?.userId ?? null);
    if (!team) {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    return withDeprecatedHeaders(apiSuccess(team));
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "TEAM_GET_FAILED",
        message: "Failed to load team",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}

const patchTeamSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    mission: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: "Provide at least one field to update" });

export async function PATCH(request: NextRequest, { params }: Params) {
  if (isV11BackendLockdownEnabled()) {
    return deprecatedResponse("TEAMS_DEPRECATED");
  }
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  const { slug } = await params;
  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const zod = patchTeamSchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);

  try {
    const team = await updateTeamProfile({
      teamSlug: slug,
      actorUserId: auth.user.userId,
      name: zod.data.name,
      mission: zod.data.mission === undefined ? undefined : (zod.data.mission ?? null),
    });
    return apiSuccess({ team });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    if (msg === "INVALID_TEAM_MISSION") {
      return apiError({ code: "INVALID_BODY", message: "mission must be at most 500 characters" }, 400);
    }
    const log = getRequestLogger(request, { route: "PATCH /api/v1/teams/[slug]" });
    log.error({ err: serializeError(error) }, "team profile update failed");
    return apiError(
      {
        code: "TEAM_UPDATE_FAILED",
        message: "Failed to update team settings",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
