import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { createApiKeyForUser, listApiKeysForUser, getUserTier } from "@/lib/repository";
import { checkApiKeyLimit } from "@/lib/subscription";
import { safeServerErrorDetails } from "@/lib/safe-error-details";
import { writeAuditLog } from "@/lib/audit";

const createSchema = z.object({
  label: z.string().min(1).max(80),
  scopes: z.array(z.string().min(1)).optional(),
  /** Optional key lifetime in days (1–3650) */
  expiresInDays: z.number().int().min(1).max(3650).optional(),
});

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const keys = await listApiKeysForUser(session.userId);
    return apiSuccess({ keys });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "API_KEYS_LIST_FAILED",
        message: "Failed to list API keys",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const tier = await getUserTier(session.userId);
    const keys = await listApiKeysForUser(session.userId);
    const activeCount = keys.filter((k) => !k.revokedAt).length;
    const gate = checkApiKeyLimit(tier, activeCount);
    if (!gate.allowed) {
      return apiError(
        {
          code: "API_KEY_LIMIT_REACHED",
          message: "You have reached the maximum number of API keys for your plan.",
          details: { upgradeReason: gate.upgradeReason, currentTier: tier },
        },
        403
      );
    }

    const json = await request.json();
    const parsed = createSchema.parse(json);
    const created = await createApiKeyForUser({
      userId: session.userId,
      label: parsed.label,
      scopes: parsed.scopes,
      expiresInDays: parsed.expiresInDays,
    });
    // G-06: audit log for API key creation
    void writeAuditLog({
      actorId: session.userId,
      action: "api_key.created",
      entityType: "api_key",
      entityId: created.id,
      metadata: { label: parsed.label, scopes: parsed.scopes },
    });
    return apiSuccess({ key: created }, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid label", details: error.flatten() }, 400);
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "INVALID_API_KEY_LABEL") {
      return apiError({ code: "INVALID_API_KEY_LABEL", message: "Label is required" }, 400);
    }
    if (msg === "USER_NOT_FOUND") {
      return apiError({ code: "USER_NOT_FOUND", message: "User not found" }, 404);
    }
    if (msg === "INVALID_API_KEY_SCOPE") {
      return apiError({ code: "INVALID_API_KEY_SCOPE", message: "One or more scopes are invalid" }, 400);
    }
    if (msg === "API_KEY_SCOPE_READ_PUBLIC_REQUIRED") {
      return apiError(
        { code: "API_KEY_SCOPE_READ_PUBLIC_REQUIRED", message: "scopes must include read:public" },
        400
      );
    }
    if (msg === "INVALID_API_KEY_EXPIRES_IN_DAYS") {
      return apiError({ code: "INVALID_API_KEY_EXPIRES_IN_DAYS", message: "expiresInDays must be 1–3650" }, 400);
    }
    return apiError(
      {
        code: "API_KEY_CREATE_FAILED",
        message: "Failed to create API key",
        details: msg,
      },
      500
    );
  }
}