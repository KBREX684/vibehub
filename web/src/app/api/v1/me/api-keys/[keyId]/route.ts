import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { revokeApiKeyForUser } from "@/lib/repository";
import { writeAuditLog } from "@/lib/audit";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { z } from "zod";

interface Params {
  params: Promise<{ keyId: string }>;
}

const patchSchema = z.object({
  agentLabel: z.string().max(120).nullable().optional(),
});

/** G-05: Update agent label on an API key. */
export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { keyId: rawKeyId } = await params;
    const keyParse = z.string().min(1).safeParse(rawKeyId);
    if (!keyParse.success) {
      return apiError({ code: "INVALID_KEY_ID", message: "Invalid API key id" }, 400);
    }
    const keyId = keyParse.data;
    const json = await request.json();
    const parsed = patchSchema.parse(json);

    if (isMockDataEnabled()) {
      const { mockApiKeys } = await import("@/lib/data/mock-api-keys");
      const key = mockApiKeys.find((k) => k.id === keyId && k.userId === session.userId);
      if (!key) {
        return apiError({ code: "API_KEY_NOT_FOUND", message: "API key not found" }, 404);
      }
      (key as Record<string, unknown>).agentLabel = parsed.agentLabel ?? null;
      return apiSuccess({ ok: true, agentLabel: parsed.agentLabel ?? null });
    }

    const { prisma } = await import("@/lib/db");
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: session.userId, revokedAt: null },
    });
    if (!key) {
      return apiError({ code: "API_KEY_NOT_FOUND", message: "API key not found" }, 404);
    }
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { agentLabel: parsed.agentLabel ?? null },
    });
    return apiSuccess({ ok: true, agentLabel: parsed.agentLabel ?? null });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid body", details: error.flatten() }, 400);
    }
    const msg = error instanceof Error ? error.message : String(error);
    return apiError({ code: "API_KEY_PATCH_FAILED", message: "Failed to update API key", details: msg }, 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { keyId: rawKeyId } = await params;
    const keyParse = z.string().min(1).safeParse(rawKeyId);
    if (!keyParse.success) {
      return apiError({ code: "INVALID_KEY_ID", message: "Invalid API key id" }, 400);
    }
    const keyId = keyParse.data;
    await revokeApiKeyForUser({ userId: session.userId, keyId });
    // G-06: audit log for API key revocation
    void writeAuditLog({
      actorId: session.userId,
      action: "api_key.revoked",
      entityType: "api_key",
      entityId: keyId,
    });
    return apiSuccess({ ok: true });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    return apiError(
      {
        code: "API_KEY_REVOKE_FAILED",
        message: "Failed to revoke API key",
        details: msg,
      },
      500
    );
  }
}