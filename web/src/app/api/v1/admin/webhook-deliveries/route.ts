import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { listWebhookDeliveries } from "@/lib/repository";
import { requireAdminSession } from "@/lib/admin-auth";
import { safeParseIntParam } from "@/lib/safe-parse-int-param";

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId")?.trim() || undefined;
    const safeLimit = safeParseIntParam(url.searchParams.get("limit"), 100, 1, 500);
    const items = await listWebhookDeliveries({
      userId,
      limit: safeLimit,
    });
    return apiSuccess({ deliveries: items });
  } catch (error) {
    const r = apiErrorFromRepositoryCatch(error);
    if (r) return r;
    return apiError({ code: "ADMIN_WEBHOOK_DELIVERIES_FAILED", message: "Failed to list webhook deliveries" }, 500);
  }
}
