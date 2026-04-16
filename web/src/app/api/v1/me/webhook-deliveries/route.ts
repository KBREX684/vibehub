import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { listWebhookDeliveries } from "@/lib/repository";

export async function GET(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit");
  const parsed = limitRaw ? Number.parseInt(limitRaw, 10) : 50;
  const safeLimit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 500) : 50;
  const items = await listWebhookDeliveries({
    userId: session.userId,
    limit: safeLimit,
  });
  return apiSuccess({ deliveries: items });
}
