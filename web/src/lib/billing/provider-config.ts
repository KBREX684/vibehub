import type { PaymentProviderId, PaymentProviderMode, PaymentProviderReadiness } from "@/lib/billing/types";

function isProductionLike() {
  return process.env.NODE_ENV === "production" || process.env.ENFORCE_REQUIRED_ENV === "true";
}

function env(value: string | undefined | null) {
  return value?.trim() || "";
}

export interface StripeProviderConfig {
  secretKey: string;
  webhookSecret: string;
  priceIdPro: string;
}

export interface AlipayProviderConfig {
  mode: PaymentProviderMode;
  gatewayUrl: string;
  appId: string;
  privateKey: string;
  publicKey: string;
  productCode: string;
}

export interface WeChatPayProviderConfig {
  mode: PaymentProviderMode;
  apiBaseUrl: string;
  appId: string;
  mchId: string;
  serialNo: string;
  privateKey: string;
  publicKey: string;
  apiV3Key: string;
}

export function getStripeConfig(): StripeProviderConfig | null {
  const secretKey = env(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = env(process.env.STRIPE_WEBHOOK_SECRET);
  const priceIdPro = env(process.env.STRIPE_PRICE_PRO);
  if (!secretKey || !webhookSecret || !priceIdPro) return null;
  return { secretKey, webhookSecret, priceIdPro };
}

export function getAlipayConfig(): AlipayProviderConfig | null {
  const mode = (env(process.env.ALIPAY_MODE) || "sandbox") as PaymentProviderMode;
  if (mode === "sandbox") {
    if (isProductionLike()) return null;
    return {
      mode,
      gatewayUrl: env(process.env.ALIPAY_GATEWAY_URL) || "https://openapi.alipay.com/gateway.do",
      appId: "",
      privateKey: "",
      publicKey: "",
      productCode: env(process.env.ALIPAY_PRODUCT_CODE) || "FAST_INSTANT_TRADE_PAY",
    };
  }

  const gatewayUrl = env(process.env.ALIPAY_GATEWAY_URL) || "https://openapi.alipay.com/gateway.do";
  const appId = env(process.env.ALIPAY_APP_ID);
  const privateKey = env(process.env.ALIPAY_PRIVATE_KEY);
  const publicKey = env(process.env.ALIPAY_PUBLIC_KEY);
  const productCode = env(process.env.ALIPAY_PRODUCT_CODE) || "FAST_INSTANT_TRADE_PAY";
  if (!appId || !privateKey || !publicKey) return null;
  return { mode, gatewayUrl, appId, privateKey, publicKey, productCode };
}

export function getWeChatPayConfig(): WeChatPayProviderConfig | null {
  const mode = (env(process.env.WECHATPAY_MODE) || "sandbox") as PaymentProviderMode;
  if (mode === "sandbox") {
    if (isProductionLike()) return null;
    return {
      mode,
      apiBaseUrl: env(process.env.WECHATPAY_API_BASE_URL) || "https://api.mch.weixin.qq.com",
      appId: "",
      mchId: "",
      serialNo: "",
      privateKey: "",
      publicKey: "",
      apiV3Key: "",
    };
  }

  const apiBaseUrl = env(process.env.WECHATPAY_API_BASE_URL) || "https://api.mch.weixin.qq.com";
  const appId = env(process.env.WECHATPAY_APP_ID);
  const mchId = env(process.env.WECHATPAY_MCH_ID);
  const serialNo = env(process.env.WECHATPAY_SERIAL_NO);
  const privateKey = env(process.env.WECHATPAY_PRIVATE_KEY);
  const publicKey = env(process.env.WECHATPAY_PUBLIC_KEY);
  const apiV3Key = env(process.env.WECHATPAY_API_V3_KEY);
  if (!appId || !mchId || !serialNo || !privateKey || !publicKey || !apiV3Key) return null;
  return { mode, apiBaseUrl, appId, mchId, serialNo, privateKey, publicKey, apiV3Key };
}

export function getPaymentProviderReadiness(id: PaymentProviderId): PaymentProviderReadiness {
  if (id === "stripe") {
    const config = getStripeConfig();
    return {
      id,
      label: "Stripe",
      mode: "live",
      status: config ? "ready" : "not_configured",
      notes: config
        ? ["Configured for overseas card checkout and subscription portal."]
        : ["Requires STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and STRIPE_PRICE_PRO."],
    };
  }

  if (id === "alipay") {
    const config = getAlipayConfig();
    if (!config) {
      return {
        id,
        label: "Alipay",
        mode: "live",
        status: "not_configured",
        notes: isProductionLike()
          ? ["Production-like environments require ALIPAY_MODE=live with app ID and RSA keys."]
          : ["Set ALIPAY_MODE=live plus app ID and RSA keys for real merchant checkout."],
      };
    }
    return {
      id,
      label: "Alipay",
      mode: config.mode,
      status: config.mode === "sandbox" ? "sandbox" : "ready",
      notes:
        config.mode === "sandbox"
          ? ["Sandbox-only checkout is enabled for local or staging rehearsals."]
          : ["Ready for signed page-pay checkout and async notify handling."],
    };
  }

  const config = getWeChatPayConfig();
  if (!config) {
    return {
      id,
      label: "WeChat Pay",
      mode: "live",
      status: "not_configured",
      notes: isProductionLike()
        ? ["Production-like environments require WECHATPAY_MODE=live with merchant cert and API v3 key."]
        : ["Set WECHATPAY_MODE=live plus app ID, mch ID, serial no, keys, and API v3 key for H5 pay."],
    };
  }
  return {
    id,
    label: "WeChat Pay",
    mode: config.mode,
    status: config.mode === "sandbox" ? "sandbox" : "ready",
    notes:
      config.mode === "sandbox"
        ? ["Sandbox-only checkout is enabled for local or staging rehearsals."]
        : ["Ready for H5 order creation, callback verification, and payment status query."],
  };
}

export function listPaymentProviderReadiness() {
  return [
    getPaymentProviderReadiness("stripe"),
    getPaymentProviderReadiness("alipay"),
    getPaymentProviderReadiness("wechatpay"),
  ];
}

export function getSmtpReadiness(): "ready" | "not_configured" {
  const required = [
    process.env.SMTP_HOST,
    process.env.SMTP_FROM,
    process.env.SMTP_USER,
    process.env.SMTP_PASS,
  ].map((item) => env(item));
  return required.every(Boolean) ? "ready" : "not_configured";
}
