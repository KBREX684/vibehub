import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { toggleProjectBookmark } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

interface Props { params: Promise<{ slug: string }> }

export async function POST(request: NextRequest, { params }: Props) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  const { slug } = await params;
  try {
    const result = await toggleProjectBookmark(auth.user.userId, slug);
    return apiSuccess(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "PROJECT_NOT_FOUND") return apiError({ code: "PROJECT_NOT_FOUND", message: "Project not found" }, 404);
    return apiError({ code: "BOOKMARK_FAILED", message: msg }, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  return POST(request, { params });
}
