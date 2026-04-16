/**
 * G-07/G-08: Payment provider factory.
 *
 * Selects the appropriate payment provider based on configuration.
 * Defaults to Stripe. When PAYMENT_PROVIDER=china is set (future),
 * the China provider will be used.
 */
import type { PaymentProvider } from "./types";
import { StripePaymentProvider } from "./stripe-provider";
import { ChinaPaymentProvider } from "./china-provider";

export type { PaymentProvider } from "./types";
export type {
  CheckoutParams,
  CheckoutResult,
  PortalParams,
  PortalResult,
  WebhookVerifyParams,
  WebhookEvent,
} from "./types";

const providers: Record<string, () => PaymentProvider> = {
  stripe: () => new StripePaymentProvider(),
  china: () => new ChinaPaymentProvider(),
};

/**
 * Returns the configured payment provider instance.
 * Defaults to "stripe" unless PAYMENT_PROVIDER env var is set.
 */
export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER?.trim()?.toLowerCase() || "stripe";
  const factory = providers[name];
  if (!factory) {
    throw new Error(`Unknown payment provider: ${name}. Supported: ${Object.keys(providers).join(", ")}`);
  }
  return factory();
}

/** Returns all registered provider names. */
export function getAvailableProviders(): string[] {
  return Object.keys(providers);
}
