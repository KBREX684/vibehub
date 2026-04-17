import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { getApiKeyUsageForUser } from "@/lib/repository";

interface Params {
  params: Promise<{ keyId: string }>;
}

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { keyId } = await params;
    const parsedKey = z.string().min(1).safeParse(keyId);
    if (!parsedKey.success) {
      return apiError({ code: "INVALID_KEY_ID", message: "Invalid API key id" }, 400);
    }

    const url = new URL(request.url);
    const query = querySchema.safeParse({
      days: url.searchParams.get("days") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!query.success) {
      return apiError({ code: "INVALID_QUERY", message: "Invalid usage query", details: query.error.flatten() }, 400);
    }

    const usage = await getApiKeyUsageForUser({
      userId: session.userId,
      keyId: parsedKey.data,
      days: query.data.days,
      limit: query.data.limit,
    });
    return apiSuccess({ usage });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    return apiError(
      {
        code: "API_KEY_USAGE_FAILED",
        message: "Failed to load API key usage",
        details: msg,
      },
      500
    );
  }
}
