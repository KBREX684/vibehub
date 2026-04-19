import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, getSessionUserFromCookie, rateLimitedResponse } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { getComplianceSettings, updateComplianceSettings } from "@/lib/repositories/aigc.repository";

const patchSchema = z.object({
  aigcAutoStamp: z.boolean().optional(),
  aigcProvider: z.enum(["local", "tencent", "aliyun"]).optional(),
  ledgerEnabled: z.boolean().optional(),
});

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const settings = await getComplianceSettings(session.userId);
    return apiSuccess(settings);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to fetch compliance settings";
    return apiError({ code: "COMPLIANCE_SETTINGS_GET_FAILED", message }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError({ code: "INVALID_JSON", message: "Invalid JSON" }, 400);
  }

  let parsed: z.infer<typeof patchSchema>;
  try {
    parsed = patchSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    return apiError({ code: "INVALID_BODY", message: "Invalid payload" }, 400);
  }

  try {
    const settings = await updateComplianceSettings({
      userId: auth.user.userId,
      aigcAutoStamp: parsed.aigcAutoStamp,
      aigcProvider: parsed.aigcProvider,
      ledgerEnabled: parsed.ledgerEnabled,
    });
    return apiSuccess(settings);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to update compliance settings";
    return apiError({ code: "COMPLIANCE_SETTINGS_UPDATE_FAILED", message }, 500);
  }
}

export async function PUT(request: NextRequest) {
  return PATCH(request);
}
