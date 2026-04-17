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
import { getPaymentProviderReadiness, getWeChatPayConfig } from "@/lib/billing/provider-config";
import { TIER_PRICING } from "@/lib/subscription";
import { getUserSubscription } from "@/lib/repositories/billing.repository";
import { amountCentsForTier, createPendingBillingRecord, createWechatAuthorizationHeader, decryptWechatResource, generateOrderNumber, markBillingSucceededAndExtendSubscription, verifyWechatSignature } from "@/lib/billing/providers/shared";

function ensureConfigured() {
  const config = getWeChatPayConfig();
  if (!config) throw new Error("WECHATPAY_NOT_CONFIGURED");
  return config;
}

async function signedWechatFetch<T>(config: NonNullable<ReturnType<typeof getWeChatPayConfig>>, params: {
  method: "GET" | "POST";
  path: string;
  body?: Record<string, unknown>;
}) {
  const bodyText = params.body ? JSON.stringify(params.body) : "";
  const authorization = createWechatAuthorizationHeader({
    method: params.method,
    canonicalPath: params.path,
    body: bodyText,
    mchId: config.mchId,
    serialNo: config.serialNo,
    privateKey: config.privateKey,
  });
  const response = await fetch(`${config.apiBaseUrl}${params.path}`, {
    method: params.method,
    headers: {
      Authorization: authorization,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: bodyText || undefined,
  });
  const text = await response.text();
  const json = text ? (JSON.parse(text) as T) : null;
  return { response, json, text };
}

export class WeChatPayPaymentProvider implements PaymentProvider {
  readonly id = "wechatpay" as const;

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
        description: `${TIER_PRICING[params.tier].label} sandbox checkout via WeChat Pay`,
        metadata: { successUrl: params.successUrl, cancelUrl: params.cancelUrl, sandbox: true },
      });
      return {
        url: `${params.baseUrl}/checkout/sandbox?record=${encodeURIComponent(record.id)}`,
        sessionId: record.id,
        mode: "sandbox",
      };
    }

    const outTradeNo = generateOrderNumber("WXP");
    await createPendingBillingRecord({
      userId: params.userId,
      tier: params.tier,
      paymentProvider: this.id,
      externalSessionId: outTradeNo,
      description: `${TIER_PRICING[params.tier].label} monthly renewal via WeChat Pay`,
      metadata: { successUrl: params.successUrl, cancelUrl: params.cancelUrl, live: true },
    });

    const path = "/v3/pay/transactions/h5";
    const body = {
      appid: config.appId,
      mchid: config.mchId,
      description: `VibeHub ${TIER_PRICING[params.tier].label} 月度订阅`,
      out_trade_no: outTradeNo,
      notify_url: `${params.baseUrl}/api/v1/billing/webhook`,
      amount: {
        total: amountCentsForTier(params.tier),
        currency: "CNY",
      },
      scene_info: {
        payer_client_ip: params.requestIp ?? "127.0.0.1",
        h5_info: {
          type: "Wap",
          app_name: "VibeHub",
          app_url: params.baseUrl,
        },
      },
    };
    const { response, json, text } = await signedWechatFetch<{ h5_url?: string; code?: string; message?: string }>(config, {
      method: "POST",
      path,
      body,
    });
    if (!response.ok || !json?.h5_url) {
      throw new Error(`WECHATPAY_ORDER_CREATE_FAILED:${response.status}:${json?.code ?? text}`);
    }
    const redirectUrl = `${json.h5_url}${json.h5_url.includes("?") ? "&" : "?"}redirect_url=${encodeURIComponent(params.successUrl)}`;
    return { url: redirectUrl, sessionId: outTradeNo, mode: "live" };
  }

  async createPortalSession(params: PortalSessionParams): Promise<PortalSessionResult> {
    return { url: `${params.returnUrl}${params.returnUrl.includes("?") ? "&" : "?"}portal=manual&provider=wechatpay`, manual: true };
  }

  async handleWebhook(payload: WebhookPayload): Promise<WebhookHandleResult> {
    const config = ensureConfigured();
    if (config.mode === "sandbox") {
      return {
        status: 400,
        body: JSON.stringify({ code: "FAIL", message: "Sandbox provider does not accept live webhooks" }),
        contentType: "application/json",
      };
    }

    const timestamp = payload.headers.get("wechatpay-timestamp") || payload.headers.get("Wechatpay-Timestamp");
    const nonce = payload.headers.get("wechatpay-nonce") || payload.headers.get("Wechatpay-Nonce");
    const signature = payload.headers.get("wechatpay-signature") || payload.headers.get("Wechatpay-Signature");
    if (!timestamp || !nonce || !signature) {
      return { status: 400, body: JSON.stringify({ code: "FAIL", message: "Missing WeChat Pay signature headers" }), contentType: "application/json" };
    }
    const verified = verifyWechatSignature({ timestamp, nonce, rawBody: payload.rawBody, signature, publicKey: config.publicKey });
    if (!verified) {
      return { status: 400, body: JSON.stringify({ code: "FAIL", message: "Invalid WeChat Pay signature" }), contentType: "application/json" };
    }

    const body = JSON.parse(payload.rawBody) as {
      event_type?: string;
      resource?: {
        nonce?: string;
        associated_data?: string;
        ciphertext?: string;
      };
    };
    const resource = body.resource;
    if (!resource?.nonce || !resource?.ciphertext) {
      return { status: 400, body: JSON.stringify({ code: "FAIL", message: "Missing encrypted resource" }), contentType: "application/json" };
    }
    const plain = decryptWechatResource({
      apiV3Key: config.apiV3Key,
      nonce: resource.nonce,
      associatedData: resource.associated_data,
      ciphertext: resource.ciphertext,
    });
    const trade = JSON.parse(plain) as {
      out_trade_no?: string;
      transaction_id?: string;
      trade_state?: string;
    };

    if (trade.out_trade_no && trade.trade_state === "SUCCESS") {
      const recordUserId = await getUserIdFromRecord(trade.out_trade_no);
      await markBillingSucceededAndExtendSubscription({
        userId: recordUserId,
        paymentProvider: this.id,
        externalSessionId: trade.out_trade_no,
        externalPaymentId: trade.transaction_id,
        metadata: { tradeState: trade.trade_state, transactionId: trade.transaction_id },
      });
    }

    return { status: 200, body: JSON.stringify({ code: "SUCCESS", message: "成功" }), contentType: "application/json" };
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

async function getUserIdFromRecord(outTradeNo: string) {
  const { getBillingRecordByExternalSessionId } = await import("@/lib/repositories/billing.repository");
  const record = await getBillingRecordByExternalSessionId({ paymentProvider: "wechatpay", externalSessionId: outTradeNo });
  if (!record) throw new Error("BILLING_RECORD_NOT_FOUND");
  return record.userId;
}
