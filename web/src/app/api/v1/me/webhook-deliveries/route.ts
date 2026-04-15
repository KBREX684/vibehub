import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { listWebhookDeliveries } from "@/lib/repository";

export async function GET(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");
  const items = await listWebhookDeliveries({
    userId: session.userId,
    limit: limit ? Number.parseInt(limit, 10) : 50,
  });
  return apiSuccess({ deliveries: items });
}
