import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/billing/payment-provider";
import { clientIp } from "@/lib/api-key-rate-limit";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { readJsonObjectBody } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { getRequestLogger, serializeError } from "@/lib/logger";
import { withRequestLogging } from "@/lib/request-logging";

const checkoutBodySchema = z.object({
  tier: z.literal("pro"),
  paymentProvider: z.literal("alipay").optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  return withRequestLogging(
    request,
    {
      route: "POST /api/v1/billing/checkout",
      alertOn5xx: { kind: "billing.checkout_failed", dedupeKey: "billing-checkout-failed" },
    },
    async () => {
      const auth = await authenticateRequest(request);
      if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
      if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

      const parsed = await readJsonObjectBody(request);
      if (!parsed.ok) return parsed.response;
      const zod = checkoutBodySchema.safeParse(parsed.body);
      if (!zod.success) return apiErrorFromZod(zod.error);
      const { tier, paymentProvider = "alipay", successUrl: bodySuccess, cancelUrl: bodyCancel } = zod.data;

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      const successUrl = bodySuccess ?? `${baseUrl}/settings/subscription?success=1`;
      const cancelUrl = bodyCancel ?? `${baseUrl}/pricing`;

      try {
        const provider = getPaymentProvider(paymentProvider);
        const readiness = provider.getReadiness();
        if (readiness.status === "not_configured") {
          return apiError(
            {
              code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
              message: readiness.notes[0] ?? "支付宝支付当前未配置",
            },
            503
          );
        }
        const session = await provider.createCheckoutSession({
          userId: auth.user.userId,
          tier,
          successUrl,
          cancelUrl,
          baseUrl,
          requestIp: clientIp(request),
        });

        return apiSuccess({ url: session.url, sessionId: session.sessionId, paymentProvider, mode: session.mode });
      } catch (err) {
        const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
        if (repositoryErrorResponse) return repositoryErrorResponse;
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg === "ALIPAY_NOT_CONFIGURED"
        ) {
          return apiError({ code: "PAYMENT_PROVIDER_NOT_CONFIGURED", message: "支付宝支付当前未配置" }, 503);
        }
        const mapped = apiErrorFromRepositoryMessage(msg);
        if (mapped) return mapped;
        const log = getRequestLogger(request, { route: "POST /api/v1/billing/checkout" });
        log.error({ err: serializeError(err) }, "checkout failed");
        return apiError({ code: "CHECKOUT_FAILED", message: msg }, 500);
      }
    }
  );
}
