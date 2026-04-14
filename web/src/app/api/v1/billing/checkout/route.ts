import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { upsertStripeCustomer } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

/** v4.0: Only Free + Pro — single Stripe price mapping. */
const TIER_PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
};

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

  let body: { tier?: unknown; successUrl?: unknown; cancelUrl?: unknown };
  try { body = await request.json(); } catch { return apiError({ code: "INVALID_JSON", message: "Invalid JSON" }, 400); }

  const tier = typeof body.tier === "string" ? body.tier : "";
  const priceId = TIER_PRICE_IDS[tier];
  if (!priceId) {
    return apiError({ code: "INVALID_TIER", message: "tier must be 'pro'" }, 400);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const successUrl = typeof body.successUrl === "string" ? body.successUrl : `${baseUrl}/settings/subscription?success=1`;
  const cancelUrl = typeof body.cancelUrl === "string" ? body.cancelUrl : `${baseUrl}/pricing`;

  try {
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
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "STRIPE_NOT_CONFIGURED") {
      return apiError({ code: "STRIPE_NOT_CONFIGURED", message: "Stripe is not configured on this server" }, 503);
    }
    return apiError({ code: "CHECKOUT_FAILED", message: msg }, 500);
  }
}
