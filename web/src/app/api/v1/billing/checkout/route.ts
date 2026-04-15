import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { upsertStripeCustomer } from "@/lib/repository";
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
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

async function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_NOT_CONFIGURED");
  const { default: Stripe } = await import("stripe");
  return new Stripe(secretKey, { apiVersion: "2026-03-25.dahlia" });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const zod = checkoutBodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);
  const { tier, successUrl: bodySuccess, cancelUrl: bodyCancel } = zod.data;

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

    const stripe = await getStripe();

    // Look up or create Stripe customer
    let customerId: string | undefined;
    try {
      const { prisma } = await import("@/lib/db");
      const user = await prisma.user.findUnique({ where: { id: auth.user.userId }, select: { stripeCustomerId: true, email: true, name: true } });
      if (user?.stripeCustomerId) {
        customerId = user.stripeCustomerId;
      } else if (user) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { vibehubUserId: auth.user.userId },
        });
        customerId = customer.id;
        await upsertStripeCustomer(auth.user.userId, customer.id);
      }
    } catch {
      // non-fatal — proceed without customer ID (mock or missing DB)
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { vibehubUserId: auth.user.userId, tier },
      subscription_data: {
        metadata: { vibehubUserId: auth.user.userId, tier },
      },
    });

    return apiSuccess({ url: session.url, sessionId: session.id });
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