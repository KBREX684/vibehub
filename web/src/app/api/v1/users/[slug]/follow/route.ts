import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { toggleUserFollow } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";

interface Props { params: Promise<{ slug: string }> }

export async function POST(request: NextRequest, { params }: Props) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  const { slug } = await params;
  try {
    const result = await toggleUserFollow(auth.user.userId, slug);
    return apiSuccess(result);
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const msg = err instanceof Error ? err.message : String(err);
    if (msg === "USER_NOT_FOUND") return apiError({ code: "USER_NOT_FOUND", message: "User not found" }, 404);
    if (msg === "CANNOT_FOLLOW_SELF") return apiError({ code: "CANNOT_FOLLOW_SELF", message: "Cannot follow yourself" }, 400);
    return apiError({ code: "FOLLOW_FAILED", message: msg }, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  return POST(request, { params });
}