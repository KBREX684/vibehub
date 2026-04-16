/**
 * G-08: Alipay/WeChat Pay placeholder implementation.
 *
 * This is a placeholder that throws "Not configured" for all operations.
 * When China payment credentials are obtained, this will be replaced with
 * either Stripe Payment Methods (Alipay/WeChat) or a direct SDK integration.
 *
 * See docs/china-payment-plan.md for the implementation roadmap.
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

export class ChinaPaymentProvider implements PaymentProvider {
  readonly name = "china";

  isConfigured(): boolean {
    // Will check for ALIPAY_* / WECHAT_PAY_* env vars when implemented
    return false;
  }

  async createCheckout(_params: CheckoutParams): Promise<CheckoutResult> {
    throw new Error(
      "China payment (Alipay/WeChat Pay) is not yet configured. " +
        "See docs/china-payment-plan.md for setup instructions."
    );
  }

  async getPortalUrl(_params: PortalParams): Promise<PortalResult> {
    throw new Error("China payment portal is not yet configured.");
  }

  async verifyWebhook(_params: WebhookVerifyParams): Promise<WebhookEvent> {
    throw new Error("China payment webhook verification is not yet configured.");
  }
}
