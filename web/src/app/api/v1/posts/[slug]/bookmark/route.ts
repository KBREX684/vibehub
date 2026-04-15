import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { togglePostBookmark } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";

interface Props { params: Promise<{ slug: string }> }

export async function POST(request: NextRequest, { params }: Props) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  const { slug } = await params;
  try {
    const result = await togglePostBookmark(auth.user.userId, slug);
    return apiSuccess(result);
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const msg = err instanceof Error ? err.message : String(err);
    if (msg === "POST_NOT_FOUND") return apiError({ code: "POST_NOT_FOUND", message: "Post not found" }, 404);
    return apiError({ code: "BOOKMARK_FAILED", message: msg }, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  return POST(request, { params });
}