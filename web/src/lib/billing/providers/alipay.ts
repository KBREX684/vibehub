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
import { getAlipayConfig, getPaymentProviderReadiness } from "@/lib/billing/provider-config";
import { TIER_PRICING } from "@/lib/subscription";
import { getUserSubscription } from "@/lib/repositories/billing.repository";
import { canonicalizeAlipayParams, createPendingBillingRecord, formatCnyAmount, generateOrderNumber, markBillingSucceededAndExtendSubscription, signWithRsaSha256, timestampForAlipay, verifyWithRsaSha256 } from "@/lib/billing/providers/shared";

function ensureConfigured() {
  const config = getAlipayConfig();
  if (!config) throw new Error("ALIPAY_NOT_CONFIGURED");
  return config;
}

export class AlipayPaymentProvider implements PaymentProvider {
  readonly id = "alipay" as const;

  getReadiness(): PaymentProviderReadiness {
    return getPaymentProviderReadiness(this.id);
  }

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutSessionResult> {
    const config = ensureConfigured();
    if (config.mode === "sandbox") {
      const record = await createPendingBillingRecord({
        userId: params.userId,
        tier: params.tier,
        paymentProvider: this.id,
        externalSessionId: `${this.id}_sandbox_${Date.now()}`,
        description: `${TIER_PRICING[params.tier].label} sandbox checkout via Alipay`,
        metadata: { successUrl: params.successUrl, cancelUrl: params.cancelUrl, sandbox: true },
      });
      return {
        url: `${params.baseUrl}/checkout/sandbox?record=${encodeURIComponent(record.id)}`,
        sessionId: record.id,
        mode: "sandbox",
      };
    }

    const outTradeNo = generateOrderNumber("ALP");
    await createPendingBillingRecord({
      userId: params.userId,
      tier: params.tier,
      paymentProvider: this.id,
      externalSessionId: outTradeNo,
      description: `${TIER_PRICING[params.tier].label} monthly renewal via Alipay`,
      metadata: { successUrl: params.successUrl, cancelUrl: params.cancelUrl, live: true },
    });

    const payload: Record<string, string> = {
      app_id: config.appId,
      method: "alipay.trade.page.pay",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: timestampForAlipay(),
      version: "1.0",
      notify_url: `${params.baseUrl}/api/v1/billing/webhook`,
      return_url: params.successUrl,
      biz_content: JSON.stringify({
        out_trade_no: outTradeNo,
        product_code: config.productCode,
        total_amount: formatCnyAmount(params.tier),
        subject: `VibeHub ${TIER_PRICING[params.tier].label} 月度订阅`,
        body: `VibeHub ${TIER_PRICING[params.tier].label} 订阅（月付）`,
        timeout_express: "30m",
        quit_url: params.cancelUrl,
      }),
    };

    const signContent = canonicalizeAlipayParams(payload);
    payload.sign = signWithRsaSha256(signContent, config.privateKey);
    const url = `${config.gatewayUrl}?${new URLSearchParams(payload).toString()}`;
    return { url, sessionId: outTradeNo, mode: "live" };
  }

  async createPortalSession(params: PortalSessionParams): Promise<PortalSessionResult> {
    return { url: `${params.returnUrl}${params.returnUrl.includes("?") ? "&" : "?"}portal=manual&provider=alipay`, manual: true };
  }

  async handleWebhook(payload: WebhookPayload): Promise<WebhookHandleResult> {
    const config = ensureConfigured();
    const form = new URLSearchParams(payload.rawBody);
    const sign = form.get("sign");
    const signType = form.get("sign_type") ?? "RSA2";
    const outTradeNo = form.get("out_trade_no") ?? "";
    const tradeNo = form.get("trade_no") ?? undefined;
    const tradeStatus = form.get("trade_status") ?? "";
    const userId = form.get("passback_params") || undefined;

    if (config.mode === "live") {
      if (!sign || signType !== "RSA2") {
        return { status: 400, body: "failure", contentType: "text/plain" };
      }
      const params = Object.fromEntries(form.entries());
      delete params.sign;
      delete params.sign_type;
      const content = canonicalizeAlipayParams(params);
      const verified = verifyWithRsaSha256(content, sign, config.publicKey);
      if (!verified) {
        return { status: 400, body: "failure", contentType: "text/plain" };
      }
    }

    if (!outTradeNo) {
      return { status: 400, body: "failure", contentType: "text/plain" };
    }

    if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
      await markBillingSucceededAndExtendSubscription({
        userId: userId ?? (await getUserSubscriptionFromRecord(outTradeNo)),
        paymentProvider: this.id,
        externalSessionId: outTradeNo,
        externalPaymentId: tradeNo,
        metadata: { tradeStatus, alipayTradeNo: tradeNo },
      });
      return { status: 200, body: "success", contentType: "text/plain" };
    }

    return { status: 200, body: "success", contentType: "text/plain" };
  }

  async getSubscription(subscription: Awaited<ReturnType<typeof getUserSubscription>>): Promise<ProviderSubscriptionSnapshot | null> {
    return {
      tier: subscription.tier,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : undefined,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      autoRenew: false,
      externalReference: subscription.currentPeriodEnd,
    };
  }

  async cancelSubscription(subscription: Awaited<ReturnType<typeof getUserSubscription>>): Promise<ProviderSubscriptionSnapshot | null> {
    return {
      tier: subscription.tier,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : undefined,
      cancelAtPeriodEnd: true,
      autoRenew: false,
    };
  }
}

async function getUserSubscriptionFromRecord(outTradeNo: string) {
  const { getBillingRecordByExternalSessionId } = await import("@/lib/repositories/billing.repository");
  const record = await getBillingRecordByExternalSessionId({ paymentProvider: "alipay", externalSessionId: outTradeNo });
  if (!record) throw new Error("BILLING_RECORD_NOT_FOUND");
  return record.userId;
}
