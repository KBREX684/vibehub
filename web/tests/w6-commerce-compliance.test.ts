import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPaymentProviderReadiness } from "../src/lib/billing/provider-config";
import { detectPaymentProviderFromWebhook } from "../src/lib/billing/payment-provider";
import { resolveEntitledTier, TIER_PRICING } from "../src/lib/subscription";

const originalEnv = { ...process.env };

describe("W6 pricing and entitlement", () => {
  it("uses CNY pricing for public plans", () => {
    expect(TIER_PRICING.free.currency).toBe("CNY");
    expect(TIER_PRICING.pro.currency).toBe("CNY");
    expect(TIER_PRICING.pro.priceMonthly).toBe(29);
  });

  it("downgrades expired pro subscriptions to free entitlement", () => {
    expect(
      resolveEntitledTier({
        tier: "pro",
        status: "active",
        currentPeriodEnd: new Date(Date.now() - 60_000).toISOString(),
      })
    ).toBe("free");
  });

  it("keeps active future-dated pro subscriptions entitled", () => {
    expect(
      resolveEntitledTier({
        tier: "pro",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 60_000).toISOString(),
      })
    ).toBe("pro");
  });
});

describe("W6 provider readiness", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_PRICE_PRO;
    delete process.env.ALIPAY_MODE;
    delete process.env.ALIPAY_APP_ID;
    delete process.env.ALIPAY_PRIVATE_KEY;
    delete process.env.ALIPAY_PUBLIC_KEY;
    delete process.env.WECHATPAY_MODE;
    delete process.env.WECHATPAY_APP_ID;
    delete process.env.WECHATPAY_MCH_ID;
    delete process.env.WECHATPAY_SERIAL_NO;
    delete process.env.WECHATPAY_PRIVATE_KEY;
    delete process.env.WECHATPAY_PUBLIC_KEY;
    delete process.env.WECHATPAY_API_V3_KEY;
    Object.assign(process.env, { NODE_ENV: "development" });
    delete process.env.ENFORCE_REQUIRED_ENV;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("marks china providers as sandbox in local development by default", () => {
    expect(getPaymentProviderReadiness("alipay").status).toBe("sandbox");
  });

  it("requires live credentials in production-like environments", () => {
    Object.assign(process.env, { NODE_ENV: "production" });
    expect(getPaymentProviderReadiness("alipay").status).toBe("not_configured");
  });
});

describe("W6 webhook detection", () => {
  it("detects Alipay from form payload", () => {
    const headers = new Headers({ "content-type": "application/x-www-form-urlencoded" });
    expect(detectPaymentProviderFromWebhook(headers, "trade_status=TRADE_SUCCESS&out_trade_no=123")).toBe("alipay");
  });
});
