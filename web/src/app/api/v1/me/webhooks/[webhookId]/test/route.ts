import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { testUserWebhook } from "@/lib/repository";
import { getRequestLogger, serializeError } from "@/lib/logger";

interface Params {
  params: Promise<{ webhookId: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  const { webhookId: rawId } = await params;
  const idParse = z.string().min(1).safeParse(rawId);
  if (!idParse.success) {
    return apiError({ code: "INVALID_WEBHOOK_ID", message: "Invalid webhook id" }, 400);
  }
  const webhookId = idParse.data;
  try {
    const result = await testUserWebhook({ userId: session.userId, webhookId });
    return apiSuccess(result);
  } catch (e) {
    const r = apiErrorFromRepositoryCatch(e);
    if (r) return r;
    const msg = e instanceof Error ? e.message : String(e);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    const log = getRequestLogger(request, { route: "POST /api/v1/me/webhooks/[webhookId]/test" });
    log.error({ err: serializeError(e) }, "webhook test failed");
    return apiError({ code: "WEBHOOK_TEST_FAILED", message: "Webhook test failed" }, 500);
  }
}
