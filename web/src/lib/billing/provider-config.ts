import type { PaymentProviderId, PaymentProviderMode, PaymentProviderReadiness } from "@/lib/billing/types";

function isProductionLike() {
  return process.env.NODE_ENV === "production" || process.env.ENFORCE_REQUIRED_ENV === "true";
}

function env(value: string | undefined | null) {
  return value?.trim() || "";
}

export interface AlipayProviderConfig {
  mode: PaymentProviderMode;
  gatewayUrl: string;
  appId: string;
  privateKey: string;
  publicKey: string;
  productCode: string;
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

export function getPaymentProviderReadiness(id: PaymentProviderId): PaymentProviderReadiness {
  const config = getAlipayConfig();
  if (!config) {
    return {
      id,
      label: "支付宝",
      mode: "live",
      status: "not_configured",
      notes: isProductionLike()
        ? ["生产环境需要配置 ALIPAY_MODE=live 以及应用 ID 和 RSA 密钥。"]
        : ["请设置 ALIPAY_MODE=live，并补齐应用 ID 与 RSA 密钥。"],
    };
  }
  return {
    id,
    label: "支付宝",
    mode: config.mode,
    status: config.mode === "sandbox" ? "sandbox" : "ready",
    notes:
      config.mode === "sandbox"
        ? ["当前环境启用了支付宝沙箱或本地演练模式。"]
        : ["已就绪，可用于页面支付与异步通知处理。"],
  };
}

export function listPaymentProviderReadiness() {
  return [getPaymentProviderReadiness("alipay")];
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
