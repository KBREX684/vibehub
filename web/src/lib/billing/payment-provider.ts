import { listPaymentProviderReadiness } from "@/lib/billing/provider-config";
import type { PaymentProvider, PaymentProviderId } from "@/lib/billing/types";
import { AlipayPaymentProvider } from "@/lib/billing/providers/alipay";

export * from "@/lib/billing/types";

const PROVIDERS: Record<PaymentProviderId, PaymentProvider> = {
  alipay: new AlipayPaymentProvider(),
};

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider {
  return PROVIDERS[id];
}

export function getAllPaymentProviderReadiness() {
  return listPaymentProviderReadiness();
}

export function detectPaymentProviderFromWebhook(headers: Headers, rawBody: string): PaymentProviderId | null {
  const contentType = headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/x-www-form-urlencoded") && rawBody.includes("trade_status=")) {
    return "alipay";
  }
  return null;
}
