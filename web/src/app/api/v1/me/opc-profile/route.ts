import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { readJsonObjectBody } from "@/lib/api-json-body";
import {
  getOpcTrustMetric,
  getOrCreateOpcProfile,
  updateOpcProfile,
} from "@/lib/repositories/opc-profile.repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromZod } from "@/lib/zod-api-error";

const opcProfilePatchSchema = z
  .object({
    headline: z.string().trim().max(120, "headline must be <= 120 characters").optional(),
    summary: z.string().trim().max(500, "summary must be <= 500 characters").optional(),
    serviceScope: z.string().trim().max(240, "serviceScope must be <= 240 characters").optional(),
    city: z.string().trim().max(60, "city must be <= 60 characters").optional(),
    websiteUrl: z.string().trim().url("websiteUrl must be a valid URL").optional(),
    proofUrl: z.string().trim().url("proofUrl must be a valid URL").optional(),
    publicCard: z.boolean().optional(),
  })
  .strict();

function trimOrUndefined(value: string | undefined) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const [profile, metrics] = await Promise.all([
      getOrCreateOpcProfile(auth.user.userId),
      getOpcTrustMetric(auth.user.userId),
    ]);
    return apiSuccess({ profile, metrics });
  } catch (error) {
    return (
      apiErrorFromRepositoryCatch(error) ??
      apiError(
        {
          code: "OPC_PROFILE_FETCH_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      )
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const parsedBody = await readJsonObjectBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = opcProfilePatchSchema.safeParse(parsedBody.body);
  if (!parsed.success) return apiErrorFromZod(parsed.error);

  try {
    const profile = await updateOpcProfile({
      userId: auth.user.userId,
      headline: trimOrUndefined(parsed.data.headline),
      summary: trimOrUndefined(parsed.data.summary),
      serviceScope: trimOrUndefined(parsed.data.serviceScope),
      city: trimOrUndefined(parsed.data.city),
      websiteUrl: trimOrUndefined(parsed.data.websiteUrl),
      proofUrl: trimOrUndefined(parsed.data.proofUrl),
      publicCard: parsed.data.publicCard,
    });
    const metrics = await getOpcTrustMetric(auth.user.userId);
    return apiSuccess({ profile, metrics });
  } catch (error) {
    return (
      apiErrorFromRepositoryCatch(error) ??
      apiError(
        {
          code: "OPC_PROFILE_UPDATE_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      )
    );
  }
}
