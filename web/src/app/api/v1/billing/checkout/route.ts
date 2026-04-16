import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/billing/payment-provider";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { readJsonObjectBody } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { getRequestLogger, serializeError } from "@/lib/logger";

/** v4.0: Only Free + Pro — single Stripe price mapping. */
const TIER_PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
};

const useMockData = isMockDataEnabled();

const checkoutBodySchema = z.object({
  tier: z.literal("pro"),
  paymentProvider: z.enum(["stripe", "alipay", "wechatpay"]).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const zod = checkoutBodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);
  const { tier, paymentProvider = "stripe", successUrl: bodySuccess, cancelUrl: bodyCancel } = zod.data;

  const priceId = TIER_PRICE_IDS[tier];
  if (!priceId) {
    return apiError({ code: "INVALID_TIER", message: "tier must be 'pro'" }, 400);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const successUrl = bodySuccess ?? `${baseUrl}/settings/subscription?success=1`;
  const cancelUrl = bodyCancel ?? `${baseUrl}/pricing`;

  try {
    if (!process.env.STRIPE_SECRET_KEY && useMockData) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      return apiSuccess({
        url: `${baseUrl}/settings/subscription?checkout=mock`,
        sessionId: "mock_checkout_session",
      });
    }

    const provider = getPaymentProvider(paymentProvider);
    const session = await provider.createCheckoutSession({
      userId: auth.user.userId,
      tier,
      successUrl,
      cancelUrl,
      baseUrl,
      stripePriceId: priceId,
    });

    return apiSuccess({ url: session.url, sessionId: session.sessionId, paymentProvider });
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = err instanceof Error ? err.message : String(err);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    const log = getRequestLogger(request, { route: "POST /api/v1/billing/checkout" });
    log.error({ err: serializeError(err) }, "checkout failed");
    return apiError({ code: "CHECKOUT_FAILED", message: msg }, 500);
  }
}
