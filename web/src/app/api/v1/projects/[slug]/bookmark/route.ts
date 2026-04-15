import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { toggleProjectBookmark } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { getRequestLogger, serializeError } from "@/lib/logger";

interface Props { params: Promise<{ slug: string }> }

const slugParamSchema = z.string().min(1);

export async function POST(request: NextRequest, { params }: Props) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  const { slug: rawSlug } = await params;
  const slugParse = slugParamSchema.safeParse(rawSlug);
  if (!slugParse.success) return apiError({ code: "INVALID_SLUG", message: "Invalid project slug" }, 400);
  const slug = slugParse.data;
  try {
    const result = await toggleProjectBookmark(auth.user.userId, slug);
    return apiSuccess(result);
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = err instanceof Error ? err.message : String(err);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    const log = getRequestLogger(request, { route: "POST /api/v1/projects/[slug]/bookmark" });
    log.error({ err: serializeError(err) }, "toggle project bookmark failed");
    return apiError({ code: "BOOKMARK_FAILED", message: "Could not update bookmark" }, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  return POST(request, { params });
}