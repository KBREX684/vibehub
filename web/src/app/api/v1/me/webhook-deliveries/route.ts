import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { listWebhookDeliveries } from "@/lib/repository";
import { safeParseIntParam } from "@/lib/safe-parse-int-param";

export async function GET(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  const url = new URL(request.url);
  const safeLimit = safeParseIntParam(url.searchParams.get("limit"), 50, 1, 500);
  const items = await listWebhookDeliveries({
    userId: session.userId,
    limit: safeLimit,
  });
  return apiSuccess({ deliveries: items });
}
