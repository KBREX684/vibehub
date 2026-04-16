/**
 * G-07/G-08: Payment Provider abstraction layer.
 *
 * Defines a common interface that any payment provider (Stripe, Alipay, WeChat Pay)
 * must implement. This enables future multi-provider support without rewriting
 * route handlers.
 */

export interface CheckoutParams {
  userId: string;
  userEmail: string;
  userName: string;
  tier: string;
  successUrl: string;
  cancelUrl: string;
  stripeCustomerId?: string;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

export interface PortalParams {
  stripeCustomerId: string;
  returnUrl: string;
}

export interface PortalResult {
  url: string;
}

export interface WebhookVerifyParams {
  rawBody: string;
  signature: string;
}

export interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

/**
 * Abstract payment provider interface.
 * Each provider (Stripe, Alipay/WeChat, etc.) implements this contract.
 */
export interface PaymentProvider {
  readonly name: string;

  /** Create a checkout session for subscription purchase. */
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;

  /** Create a billing portal session for subscription management. */
  getPortalUrl(params: PortalParams): Promise<PortalResult>;

  /** Verify and parse a webhook event from the payment provider. */
  verifyWebhook(params: WebhookVerifyParams): Promise<WebhookEvent>;

  /** Check if this provider is properly configured. */
  isConfigured(): boolean;
}
