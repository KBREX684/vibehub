import type { NextRequest } from "next/server";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { testUserWebhook } from "@/lib/repository";

interface Params {
  params: Promise<{ webhookId: string }>;
}

export async function POST(_request: NextRequest, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  const { webhookId } = await params;
  try {
    const result = await testUserWebhook({ userId: session.userId, webhookId });
    return apiSuccess(result);
  } catch (e) {
    const r = apiErrorFromRepositoryCatch(e);
    if (r) return r;
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "WEBHOOK_NOT_FOUND") return apiError({ code: "WEBHOOK_NOT_FOUND", message: msg }, 404);
    return apiError({ code: "WEBHOOK_TEST_FAILED", message: msg }, 500);
  }
}
