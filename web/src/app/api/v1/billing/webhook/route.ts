import type { NextRequest } from "next/server";
import { z } from "zod";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher";
import { upsertUserSubscription, upsertStripeCustomer } from "@/lib/repository";
import { getRequestLogger, serializeError } from "@/lib/logger";
import type { SubscriptionTier } from "@/lib/types";

const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  [process.env.STRIPE_PRICE_PRO ?? "__pro__"]: "pro",
};

const stripeWebhookEventSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.record(z.unknown()),
  }),
});

function tierFromPriceId(priceId: string | null | undefined): SubscriptionTier {
  if (!priceId) return "free";
  return PRICE_TO_TIER[priceId] ?? "free";
}

/**
 * M-2: Stripe webhook handler.
 * Handles subscription lifecycle events to keep UserSubscription in sync.
 * STRIPE_WEBHOOK_SECRET is required (Stripe Dashboard → webhook endpoint signing secret).
 * Unsigned or unverified payloads are never accepted.
 */
export async function POST(request: NextRequest) {
  const requestLogger = getRequestLogger(request, { route: "/api/v1/billing/webhook" });
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secretKey) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 503 });
  }

  if (!webhookSecret) {
    requestLogger.error({}, "STRIPE_WEBHOOK_SECRET is not configured; refusing webhook");
    return new Response(JSON.stringify({ error: "Stripe webhook signing secret not configured" }), { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: z.infer<typeof stripeWebhookEventSchema>;

  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secretKey, { apiVersion: "2026-03-25.dahlia" });
    const raw = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    const parsed = stripeWebhookEventSchema.safeParse(raw);
    if (!parsed.success) {
      requestLogger.warn({ issues: parsed.error.flatten() }, "Stripe webhook payload invalid");
      return new Response(JSON.stringify({ error: "Invalid webhook payload" }), { status: 400 });
    }
    event = parsed.data;
  } catch (err) {
    requestLogger.warn({ err: serializeError(err) }, "Stripe webhook signature verification failed");
    return new Response(JSON.stringify({ error: "Webhook signature invalid" }), { status: 400 });
  }

  const obj = event.data.object;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const userId = obj.metadata && typeof obj.metadata === "object" ? (obj.metadata as Record<string, string>).vibehubUserId : undefined;
        const customerId = typeof obj.customer === "string" ? obj.customer : undefined;
        const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : undefined;
        if (userId && customerId) {
          await upsertStripeCustomer(userId, customerId);
        }
        // Subscription details will come via customer.subscription.created event
        requestLogger.info(
          { userId, subscriptionId, eventType: event.type },
          "Stripe checkout session completed"
        );
        break;
      }

      case "subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subId = typeof obj.id === "string" ? obj.id : undefined;
        const customerId = typeof obj.customer === "string" ? obj.customer : undefined;
        const status = typeof obj.status === "string" ? obj.status : "active";
        const cancelAtPeriodEnd = Boolean(obj.cancel_at_period_end);
        const currentPeriodEnd = typeof obj.current_period_end === "number" ? new Date(obj.current_period_end * 1000) : undefined;
        const metadata = obj.metadata && typeof obj.metadata === "object" ? obj.metadata as Record<string, string> : {};
        const userId = metadata.vibehubUserId;

        // Resolve priceId from items
        const items = obj.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
        const priceId: string | undefined = items?.data?.[0]?.price?.id;

        const tier = tierFromPriceId(priceId);

        const safeStatus = (["active", "past_due", "canceled", "trialing"].includes(status) ? status : "active") as "active" | "past_due" | "canceled" | "trialing";

        if (userId && subId) {
          await upsertUserSubscription({
            userId,
            tier,
            status: safeStatus,
            stripeSubscriptionId: subId,
            stripePriceId: priceId,
            currentPeriodEnd,
            cancelAtPeriodEnd,
          });
          if (safeStatus === "past_due") {
            void dispatchWebhookEvent(userId, "subscription.past_due", { stripeSubscriptionId: subId, tier });
          }
        } else if (customerId && subId) {
          // Lookup user by Stripe customer ID
          const { prisma } = await import("@/lib/db");
          const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
          if (user) {
            await upsertUserSubscription({
              userId: user.id,
              tier,
              status: safeStatus,
              stripeSubscriptionId: subId,
              stripePriceId: priceId,
              currentPeriodEnd,
              cancelAtPeriodEnd,
            });
            if (safeStatus === "past_due") {
              void dispatchWebhookEvent(user.id, "subscription.past_due", { stripeSubscriptionId: subId, tier });
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subId = typeof obj.id === "string" ? obj.id : undefined;
        const customerId = typeof obj.customer === "string" ? obj.customer : undefined;
        if (!subId && !customerId) break;

        let userId: string | undefined;
        const metadata = obj.metadata && typeof obj.metadata === "object" ? obj.metadata as Record<string, string> : {};
        userId = metadata.vibehubUserId;

        if (!userId && customerId) {
          const { prisma } = await import("@/lib/db");
          const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
          userId = user?.id;
        }

        if (userId) {
          await upsertUserSubscription({
            userId,
            tier: "free",
            status: "canceled",
            stripeSubscriptionId: subId,
            cancelAtPeriodEnd: false,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const customerId = typeof obj.customer === "string" ? obj.customer : undefined;
        const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : undefined;
        if (!customerId) break;
        const { prisma } = await import("@/lib/db");
        const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
        if (user && subscriptionId) {
          const sub = await prisma.userSubscription.findUnique({ where: { userId: user.id } });
          if (sub) {
            await upsertUserSubscription({
              userId: user.id,
              tier: sub.tier as SubscriptionTier,
              status: "past_due",
              stripeSubscriptionId: subscriptionId,
            });
            void dispatchWebhookEvent(user.id, "subscription.past_due", {
              stripeSubscriptionId: subscriptionId,
              tier: sub.tier,
            });
          }
        }
        break;
      }

      default:
        // Unhandled event type — no-op
        break;
    }
  } catch (err) {
    requestLogger.error(
      { err: serializeError(err), eventType: event.type },
      "Stripe webhook handler failed"
    );
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
