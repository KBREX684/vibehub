import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";

const useMockData = process.env.USE_MOCK_DATA !== "false";

/** M-2: Create a Stripe Customer Portal session for managing/canceling subscriptions. */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    if (useMockData) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      return apiSuccess({
        url: `${baseUrl}/settings/subscription?portal=mock`,
      });
    }
    return apiError({ code: "STRIPE_NOT_CONFIGURED", message: "Stripe is not configured" }, 503);
  }

  try {
    let body: { returnUrl?: unknown } = {};
    try { body = await request.json(); } catch { /* ignore */ }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl : `${baseUrl}/settings/subscription`;

    const { prisma } = await import("@/lib/db");
    const user = await prisma.user.findUnique({ where: { id: auth.user.userId }, select: { stripeCustomerId: true } });
    if (!user?.stripeCustomerId) {
      return apiError({ code: "NO_STRIPE_CUSTOMER", message: "No billing account found. Please subscribe first." }, 404);
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secretKey, { apiVersion: "2026-03-25.dahlia" });
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    return apiSuccess({ url: session.url });
  } catch (err) {
    return apiError({ code: "PORTAL_FAILED", message: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
