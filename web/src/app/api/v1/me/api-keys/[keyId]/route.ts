import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { revokeApiKeyForUser } from "@/lib/repository";

interface Params {
  params: Promise<{ keyId: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { keyId } = await params;
    await revokeApiKeyForUser({ userId: session.userId, keyId });
    return apiSuccess({ ok: true });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const msg = error instanceof Error ? error.message : String(error);
    if (msg === "API_KEY_NOT_FOUND") {
      return apiError({ code: "API_KEY_NOT_FOUND", message: "API key not found" }, 404);
    }
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