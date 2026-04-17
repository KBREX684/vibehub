import type { Stripe } from "stripe";
import type {
  CheckoutParams,
  CheckoutSessionResult,
  PaymentProvider,
  PaymentProviderReadiness,
  PortalSessionParams,
  PortalSessionResult,
  ProviderSubscriptionSnapshot,
  WebhookHandleResult,
  WebhookPayload,
} from "@/lib/billing/types";
import { getPaymentProviderReadiness, getStripeConfig } from "@/lib/billing/provider-config";
import { TIER_PRICING } from "@/lib/subscription";
import { createBillingRecord, getUserSubscription, upsertUserSubscription } from "@/lib/repositories/billing.repository";
import { upsertStripeCustomer } from "@/lib/repository";
import { getRequestLogger, serializeError } from "@/lib/logger";
import type { SubscriptionTier, UserSubscription } from "@/lib/types";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher";

async function getStripeLib() {
  const config = getStripeConfig();
  if (!config) throw new Error("STRIPE_NOT_CONFIGURED");
  const { default: StripeLib } = await import("stripe");
  return new StripeLib(config.secretKey, { apiVersion: "2026-03-25.dahlia" });
}

function tierFromPriceId(priceId: string | null | undefined): SubscriptionTier {
  const config = getStripeConfig();
  if (config?.priceIdPro && priceId === config.priceIdPro) return "pro";
  return "free";
}

interface StripeSubscriptionLike {
  id: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  items: { data: Array<{ price?: { id?: string } }> };
}

export class StripePaymentProvider implements PaymentProvider {
  readonly id = "stripe" as const;

  getReadiness(): PaymentProviderReadiness {
    return getPaymentProviderReadiness(this.id);
  }

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutSessionResult> {
    const stripe = await getStripeLib();
    const config = getStripeConfig();
    if (!config) throw new Error("STRIPE_NOT_CONFIGURED");
    const { prisma } = await import("@/lib/db");
    let customerId: string | undefined;
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { stripeCustomerId: true, email: true, name: true },
    });
    if (user?.stripeCustomerId) {
      customerId = user.stripeCustomerId;
    } else if (user) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { vibehubUserId: params.userId },
      });
      customerId = customer.id;
      await upsertStripeCustomer(params.userId, customer.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: config.priceIdPro, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: { vibehubUserId: params.userId, tier: params.tier },
      subscription_data: {
        metadata: { vibehubUserId: params.userId, tier: params.tier },
      },
    });
    if (!session.url) throw new Error("STRIPE_NO_CHECKOUT_URL");

    const subscription = await getUserSubscription(params.userId);
    const pricing = TIER_PRICING[params.tier];
    await createBillingRecord({
      userId: params.userId,
      subscriptionId: subscription.id,
      paymentProvider: "stripe",
      tier: params.tier,
      amountCents: Math.round(pricing.priceMonthly * 100),
      currency: pricing.currency,
      status: "pending",
      externalSessionId: session.id,
      description: `${pricing.label} subscription checkout`,
      metadata: { successUrl: params.successUrl, cancelUrl: params.cancelUrl },
    });
    return { url: session.url, sessionId: session.id, mode: "live" };
  }

  async createPortalSession(params: PortalSessionParams): Promise<PortalSessionResult> {
    if (!params.customerId) {
      throw new Error("NO_STRIPE_CUSTOMER");
    }
    const stripe = await getStripeLib();
    const session = await stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
    return { url: session.url };
  }

  async getSubscription(subscription: UserSubscription): Promise<ProviderSubscriptionSnapshot | null> {
    if (!subscription.stripeSubscriptionId) {
      return null;
    }
    const stripe = await getStripeLib();
    const remote = (await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)) as unknown as StripeSubscriptionLike;
    const status = (["active", "past_due", "canceled", "trialing"].includes(remote.status)
      ? remote.status
      : "active") as ProviderSubscriptionSnapshot["status"];
    return {
      tier: tierFromPriceId(remote.items.data[0]?.price?.id),
      status,
      currentPeriodEnd: typeof remote.current_period_end === "number" ? new Date(remote.current_period_end * 1000) : undefined,
      cancelAtPeriodEnd: Boolean(remote.cancel_at_period_end),
      autoRenew: !remote.cancel_at_period_end,
      externalReference: remote.id,
    };
  }

  async cancelSubscription(subscription: UserSubscription): Promise<ProviderSubscriptionSnapshot | null> {
    if (!subscription.stripeSubscriptionId) return null;
    const stripe = await getStripeLib();
    const remote = (await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })) as unknown as StripeSubscriptionLike;
    return {
      tier: tierFromPriceId(remote.items.data[0]?.price?.id),
      status: (["active", "past_due", "canceled", "trialing"].includes(remote.status)
        ? remote.status
        : "active") as ProviderSubscriptionSnapshot["status"],
      currentPeriodEnd: typeof remote.current_period_end === "number" ? new Date(remote.current_period_end * 1000) : undefined,
      cancelAtPeriodEnd: Boolean(remote.cancel_at_period_end),
      autoRenew: !remote.cancel_at_period_end,
      externalReference: remote.id,
    };
  }

  async handleWebhook(payload: WebhookPayload): Promise<WebhookHandleResult> {
    const config = getStripeConfig();
    if (!config) {
      return { status: 503, body: JSON.stringify({ error: "Stripe not configured" }), contentType: "application/json" };
    }

    const signature = payload.headers.get("stripe-signature");
    if (!signature) {
      return { status: 400, body: JSON.stringify({ error: "Missing stripe-signature" }), contentType: "application/json" };
    }

    const logger = getRequestLogger(new Request(payload.requestUrl, { method: "POST" }), {
      route: "POST /api/v1/billing/webhook (stripe)",
    });

    let event: Stripe.Event;
    try {
      const stripe = await getStripeLib();
      event = stripe.webhooks.constructEvent(payload.rawBody, signature, config.webhookSecret);
    } catch (err) {
      logger.error({ err: serializeError(err) }, "Stripe webhook signature verification failed");
      return { status: 400, body: JSON.stringify({ error: "Webhook signature invalid" }), contentType: "application/json" };
    }

    const obj = event.data.object as unknown as Record<string, unknown>;

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const userId = obj.metadata && typeof obj.metadata === "object" ? (obj.metadata as Record<string, string>).vibehubUserId : undefined;
          const customerId = typeof obj.customer === "string" ? obj.customer : undefined;
          const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : undefined;
          const sessionId = typeof obj.id === "string" ? obj.id : undefined;
          if (userId && customerId) {
            await upsertStripeCustomer(userId, customerId);
          }
          if (sessionId) {
            const { prisma } = await import("@/lib/db");
            await prisma.billingRecord.updateMany({
              where: { externalSessionId: sessionId, paymentProvider: "stripe" },
              data: {
                status: "succeeded",
                externalPaymentId: subscriptionId ?? undefined,
                settledAt: new Date(),
                updatedAt: new Date(),
              },
            });
          }
          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subId = typeof obj.id === "string" ? obj.id : undefined;
          const customerId = typeof obj.customer === "string" ? obj.customer : undefined;
          const status = typeof obj.status === "string" ? obj.status : "active";
          const cancelAtPeriodEnd = Boolean(obj.cancel_at_period_end);
          const currentPeriodEnd = typeof obj.current_period_end === "number" ? new Date(obj.current_period_end * 1000) : undefined;
          const metadata = obj.metadata && typeof obj.metadata === "object" ? (obj.metadata as Record<string, string>) : {};
          let userId: string | undefined = metadata.vibehubUserId;
          const items = obj.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
          const priceId = items?.data?.[0]?.price?.id;
          const tier = tierFromPriceId(priceId);
          const safeStatus = (["active", "past_due", "canceled", "trialing"].includes(status)
            ? status
            : "active") as UserSubscription["status"];

          if (!userId && customerId) {
            const { prisma } = await import("@/lib/db");
            const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
            userId = user?.id;
          }

          if (userId && subId) {
            await upsertUserSubscription({
              userId,
              tier,
              status: safeStatus,
              paymentProvider: "stripe",
              stripeSubscriptionId: subId,
              stripePriceId: priceId,
              currentPeriodEnd,
              cancelAtPeriodEnd,
            });
            if (safeStatus === "past_due") {
              void dispatchWebhookEvent(userId, "subscription.past_due", { stripeSubscriptionId: subId, tier });
            }
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subId = typeof obj.id === "string" ? obj.id : undefined;
          const customerId = typeof obj.customer === "string" ? obj.customer : undefined;
          const metadata = obj.metadata && typeof obj.metadata === "object" ? (obj.metadata as Record<string, string>) : {};
          let userId: string | undefined = metadata.vibehubUserId;
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
              paymentProvider: "stripe",
              stripeSubscriptionId: subId,
              cancelAtPeriodEnd: false,
            });
          }
          break;
        }

        case "invoice.payment_failed": {
          const customerId = typeof obj.customer === "string" ? obj.customer : undefined;
          const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : undefined;
          const amountDue = typeof obj.amount_due === "number" ? obj.amount_due : 0;
          const currency = typeof obj.currency === "string" ? obj.currency.toUpperCase() : "CNY";
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
                paymentProvider: "stripe",
                stripeSubscriptionId: subscriptionId,
              });
              void dispatchWebhookEvent(user.id, "subscription.past_due", {
                stripeSubscriptionId: subscriptionId,
                tier: sub.tier,
              });
              await createBillingRecord({
                userId: user.id,
                subscriptionId: sub.id,
                paymentProvider: "stripe",
                tier: sub.tier as SubscriptionTier,
                amountCents: amountDue,
                currency,
                status: "failed",
                externalPaymentId: subscriptionId,
                description: "Stripe invoice payment failed",
                metadata: { eventType: event.type },
              });
            }
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      logger.error({ err: serializeError(err), eventType: event.type }, "Stripe webhook handler failed");
      return { status: 500, body: JSON.stringify({ error: "Webhook handler failed" }), contentType: "application/json" };
    }

    return { status: 200, body: JSON.stringify({ received: true }), contentType: "application/json" };
  }
}
