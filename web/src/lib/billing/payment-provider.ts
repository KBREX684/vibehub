import type { SubscriptionTier } from "@/lib/types";
import { TIER_PRICING } from "@/lib/subscription";

export type PaymentProviderId = "stripe" | "alipay" | "wechatpay";

export interface CheckoutParams {
  userId: string;
  tier: SubscriptionTier;
  successUrl: string;
  cancelUrl: string;
  baseUrl: string;
  stripePriceId?: string;
}

export interface CheckoutSessionResult {
  url: string;
  sessionId: string;
}

export interface PortalSessionResult {
  url: string;
}

/**
 * v7 P0-9: payment abstraction — Stripe is the first provider; Alipay/WeChat are stubs for P1.
 */
export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutSessionResult>;
  createPortalSession(customerId: string, returnUrl: string): Promise<PortalSessionResult>;
}

async function getStripeLib() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_NOT_CONFIGURED");
  const { default: Stripe } = await import("stripe");
  return new Stripe(secretKey, { apiVersion: "2026-03-25.dahlia" });
}

export class StripePaymentProvider implements PaymentProvider {
  readonly id = "stripe" as const;

  constructor(private priceIdPro: string) {}

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutSessionResult> {
    const stripe = await getStripeLib();
    const priceId = this.priceIdPro;
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
      const { upsertStripeCustomer } = await import("@/lib/repository");
      await upsertStripeCustomer(params.userId, customer.id);
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: { vibehubUserId: params.userId, tier: params.tier },
      subscription_data: {
        metadata: { vibehubUserId: params.userId, tier: params.tier },
      },
    });
    if (!session.url) throw new Error("STRIPE_NO_CHECKOUT_URL");
    const { createBillingRecord, getUserSubscription } = await import("@/lib/repositories/billing.repository");
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
    return { url: session.url, sessionId: session.id };
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<PortalSessionResult> {
    const stripe = await getStripeLib();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  }
}

/**
 * P1 sandbox provider — closes the full checkout/callback/subscription loop without claiming
 * production merchant readiness. This is the staging path for Alipay/WeChat before live keys.
 */
export class StubChinaPaymentProvider implements PaymentProvider {
  constructor(readonly id: "alipay" | "wechatpay") {}

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutSessionResult> {
    const { createBillingRecord, getUserSubscription } = await import("@/lib/repositories/billing.repository");
    const subscription = await getUserSubscription(params.userId);
    const pricing = TIER_PRICING[params.tier];
    const record = await createBillingRecord({
      userId: params.userId,
      subscriptionId: subscription.id,
      paymentProvider: this.id,
      tier: params.tier,
      amountCents: Math.round(pricing.priceMonthly * 100),
      currency: this.id === "alipay" || this.id === "wechatpay" ? "CNY" : pricing.currency,
      status: "pending",
      externalSessionId: `${this.id}_sandbox_${Date.now()}`,
      description: `${pricing.label} sandbox checkout via ${this.id}`,
      metadata: { successUrl: params.successUrl, cancelUrl: params.cancelUrl, sandbox: true },
    });
    const url = `${params.baseUrl}/checkout/sandbox?record=${encodeURIComponent(record.id)}`;
    return { url, sessionId: record.id };
  }

  async createPortalSession(_customerId: string, returnUrl: string): Promise<PortalSessionResult> {
    return { url: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}portal=manual` };
  }
}

export function getDefaultStripeProvider(): StripePaymentProvider | null {
  const priceId = process.env.STRIPE_PRICE_PRO?.trim();
  if (!priceId) return null;
  return new StripePaymentProvider(priceId);
}

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider {
  if (id === "stripe") {
    const p = getDefaultStripeProvider();
    if (!p) throw new Error("STRIPE_NOT_CONFIGURED");
    return p;
  }
  return new StubChinaPaymentProvider(id);
}
