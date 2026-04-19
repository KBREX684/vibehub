import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { readJsonObjectBodyOrEmpty } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { getRequestLogger, serializeError } from "@/lib/logger";
import { getUserSubscription } from "@/lib/repositories/billing.repository";
import { withRequestLogging } from "@/lib/request-logging";

const portalBodySchema = z.object({
  returnUrl: z.string().url().optional(),
});

/** 中国版：只返回支付宝续费说明入口，不提供独立账单 portal。 */
export async function POST(request: NextRequest) {
  return withRequestLogging(
    request,
    {
      route: "POST /api/v1/billing/portal",
      alertOn5xx: { kind: "billing.portal_failed", dedupeKey: "billing-portal-failed" },
    },
    async () => {
      const auth = await authenticateRequest(request);
      if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
      if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

      try {
        const parsed = await readJsonObjectBodyOrEmpty(request);
        if (!parsed.ok) return parsed.response;
        const zod = portalBodySchema.safeParse(parsed.body);
        if (!zod.success) return apiErrorFromZod(zod.error);

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
        const returnUrl = zod.data.returnUrl ?? `${baseUrl}/settings/subscription`;
        const subscription = await getUserSubscription(auth.user.userId);
        return apiSuccess({
          url: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}portal=manual&provider=alipay`,
          paymentProvider: subscription.paymentProvider ?? "alipay",
          manual: true,
        });
      } catch (err) {
        const log = getRequestLogger(request, { route: "POST /api/v1/billing/portal" });
        log.error({ err: serializeError(err) }, "billing portal failed");
        return apiError({ code: "PORTAL_FAILED", message: "无法获取支付宝续费说明" }, 500);
      }
    }
  );
}
