/**
 * G-07: Stripe implementation of PaymentProvider.
 *
 * Wraps the existing Stripe integration behind the PaymentProvider interface.
 */
import type {
  PaymentProvider,
  CheckoutParams,
  CheckoutResult,
  PortalParams,
  PortalResult,
  WebhookVerifyParams,
  WebhookEvent,
} from "./types";

export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  private get secretKey(): string | undefined {
    return process.env.STRIPE_SECRET_KEY?.trim();
  }

  private get webhookSecret(): string | undefined {
    return process.env.STRIPE_WEBHOOK_SECRET?.trim();
  }

  isConfigured(): boolean {
    return Boolean(this.secretKey);
  }

  private async getStripe() {
    if (!this.secretKey) throw new Error("STRIPE_NOT_CONFIGURED");
    const { default: Stripe } = await import("stripe");
    return new Stripe(this.secretKey, { apiVersion: "2026-03-25.dahlia" });
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const stripe = await this.getStripe();
    const priceId = process.env.STRIPE_PRICE_PRO;
    if (!priceId) throw new Error("STRIPE_PRICE_PRO not configured");

    // Create or reuse Stripe customer
    let customerId = params.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: params.userEmail,
        name: params.userName,
        metadata: { vibehubUserId: params.userId },
      });
      customerId = customer.id;
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

    return { url: session.url!, sessionId: session.id };
  }

  async getPortalUrl(params: PortalParams): Promise<PortalResult> {
    const stripe = await this.getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: params.stripeCustomerId,
      return_url: params.returnUrl,
    });
    return { url: session.url };
  }

  async verifyWebhook(params: WebhookVerifyParams): Promise<WebhookEvent> {
    if (!this.webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    const stripe = await this.getStripe();
    const event = stripe.webhooks.constructEvent(
      params.rawBody,
      params.signature,
      this.webhookSecret
    );
    return {
      type: event.type,
      data: event.data.object as Record<string, unknown>,
    };
  }
}
