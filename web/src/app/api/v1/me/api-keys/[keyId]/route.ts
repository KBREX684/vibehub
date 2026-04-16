import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { revokeApiKeyForUser } from "@/lib/repository";
import { z } from "zod";

interface Params {
  params: Promise<{ keyId: string }>;
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
      },
      500
    );
  }
}