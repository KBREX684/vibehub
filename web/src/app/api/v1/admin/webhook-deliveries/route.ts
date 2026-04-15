import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { listWebhookDeliveries } from "@/lib/repository";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit");
    const userId = url.searchParams.get("userId")?.trim() || undefined;
    const items = await listWebhookDeliveries({
      userId,
      limit: limit ? Number.parseInt(limit, 10) : 100,
    });
    return apiSuccess({ deliveries: items });
  } catch (error) {
    const r = apiErrorFromRepositoryCatch(error);
    if (r) return r;
    return apiError({ code: "ADMIN_WEBHOOK_DELIVERIES_FAILED", message: String(error) }, 500);
  }
}
