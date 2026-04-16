import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { listWebhookDeliveries } from "@/lib/repository";
import { safeParseIntParam } from "@/lib/safe-parse-int-param";
import { getRequestLogger, serializeError } from "@/lib/logger";

export async function GET(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  const requestLogger = getRequestLogger(request, { route: "/api/v1/me/webhook-deliveries" });
  try {
    const url = new URL(request.url);
    const safeLimit = safeParseIntParam(url.searchParams.get("limit"), 50, 1, 500);
    const items = await listWebhookDeliveries({
      userId: session.userId,
      limit: safeLimit,
    });
    return apiSuccess({ deliveries: items });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    requestLogger.error({ err: serializeError(error) }, "Failed to list webhook deliveries");
    return apiError({ code: "WEBHOOK_DELIVERIES_FAILED", message: "Failed to list webhook deliveries" }, 500);
  }
}
