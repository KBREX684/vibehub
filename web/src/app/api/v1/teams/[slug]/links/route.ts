import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { updateTeamLinks } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { readJsonObjectBody } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { getRequestLogger, serializeError } from "@/lib/logger";

interface Props { params: Promise<{ slug: string }> }

const optionalHttpUrl = z.union([
  z.literal(""),
  z.null(),
  z
    .string()
    .url()
    .refine((u) => ["http:", "https:"].includes(new URL(u).protocol), "Must be http(s) URL"),
]);

const patchTeamLinksSchema = z
  .object({
    discordUrl: optionalHttpUrl.optional(),
    telegramUrl: optionalHttpUrl.optional(),
    slackUrl: optionalHttpUrl.optional(),
    githubOrgUrl: optionalHttpUrl.optional(),
    githubRepoUrl: optionalHttpUrl.optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: "Provide at least one field to update" });

export async function PATCH(request: NextRequest, { params }: Props) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  const { slug } = await params;

  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const zod = patchTeamLinksSchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);

  const updates: Record<string, string | null> = {};
  for (const [field, val] of Object.entries(zod.data)) {
    if (val === undefined) continue;
    updates[field] = val === "" || val === null ? null : val;
  }

  try {
    const team = await updateTeamLinks({ teamSlug: slug, actorUserId: auth.user.userId, ...updates });
    return apiSuccess({ team });
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = err instanceof Error ? err.message : String(err);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    const log = getRequestLogger(request, { route: "PATCH /api/v1/teams/[slug]/links" });
    log.error({ err: serializeError(err) }, "team links update failed");
    return apiError({ code: "UPDATE_FAILED", message: msg }, 500);
  }
}