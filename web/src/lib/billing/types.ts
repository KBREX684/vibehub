import type { SubscriptionTier, UserSubscription } from "@/lib/types";

export type PaymentProviderId = "alipay";
export type PaymentProviderMode = "live" | "sandbox";
export type PaymentReadinessStatus = "ready" | "sandbox" | "not_configured";

export interface CheckoutParams {
  userId: string;
  tier: SubscriptionTier;
  successUrl: string;
  cancelUrl: string;
  baseUrl: string;
  requestIp?: string;
}

export interface CheckoutSessionResult {
  url: string;
  sessionId: string;
  mode: PaymentProviderMode;
}

export interface PortalSessionParams {
  userId: string;
  returnUrl: string;
  subscription: UserSubscription;
  customerId?: string;
}

export interface PortalSessionResult {
  url: string;
  manual?: boolean;
}

export interface PaymentProviderReadiness {
  id: PaymentProviderId;
  label: string;
  mode: PaymentProviderMode;
  status: PaymentReadinessStatus;
  notes: string[];
}

export interface WebhookPayload {
  rawBody: string;
  headers: Headers;
  requestUrl: string;
}

export interface WebhookHandleResult {
  status: number;
  body: string;
  contentType?: string;
}

export interface ProviderSubscriptionSnapshot {
  tier: SubscriptionTier;
  status: "active" | "past_due" | "canceled" | "trialing";
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  autoRenew: boolean;
  externalReference?: string;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  getReadiness(): PaymentProviderReadiness;
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutSessionResult>;
  createPortalSession(params: PortalSessionParams): Promise<PortalSessionResult>;
  handleWebhook(payload: WebhookPayload): Promise<WebhookHandleResult>;
  getSubscription(subscription: UserSubscription): Promise<ProviderSubscriptionSnapshot | null>;
  cancelSubscription(subscription: UserSubscription): Promise<ProviderSubscriptionSnapshot | null>;
}
