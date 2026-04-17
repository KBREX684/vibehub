import { listPaymentProviderReadiness } from "@/lib/billing/provider-config";
import type { PaymentProvider, PaymentProviderId } from "@/lib/billing/types";
import { StripePaymentProvider } from "@/lib/billing/providers/stripe";
import { AlipayPaymentProvider } from "@/lib/billing/providers/alipay";
import { WeChatPayPaymentProvider } from "@/lib/billing/providers/wechatpay";

export * from "@/lib/billing/types";

const PROVIDERS: Record<PaymentProviderId, PaymentProvider> = {
  stripe: new StripePaymentProvider(),
  alipay: new AlipayPaymentProvider(),
  wechatpay: new WeChatPayPaymentProvider(),
};

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider {
  return PROVIDERS[id];
}

export function getAllPaymentProviderReadiness() {
  return listPaymentProviderReadiness();
}

export function detectPaymentProviderFromWebhook(headers: Headers, rawBody: string): PaymentProviderId | null {
  if (headers.has("stripe-signature")) return "stripe";
  if (
    headers.has("wechatpay-signature") ||
    headers.has("Wechatpay-Signature") ||
    headers.has("wechatpay-timestamp") ||
    headers.has("Wechatpay-Timestamp")
  ) {
    return "wechatpay";
  }
  const contentType = headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/x-www-form-urlencoded") && rawBody.includes("trade_status=")) {
    return "alipay";
  }
  return null;
}
