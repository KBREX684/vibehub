import { randomBytes, createSign, createVerify, createDecipheriv } from "crypto";
import { TIER_PRICING } from "@/lib/subscription";
import type { BillingRecord, SubscriptionTier, UserSubscription } from "@/lib/types";
import { createBillingRecord, getBillingRecordByExternalSessionId, getUserSubscription, updateBillingRecordStatus, upsertUserSubscription } from "@/lib/repositories/billing.repository";

export function generateOrderNumber(prefix: string) {
  return `${prefix}${Date.now()}${randomBytes(4).toString("hex")}`.slice(0, 32);
}

export function formatCnyAmount(tier: SubscriptionTier) {
  return TIER_PRICING[tier].priceMonthly.toFixed(2);
}

export function amountCentsForTier(tier: SubscriptionTier) {
  return Math.round(TIER_PRICING[tier].priceMonthly * 100);
}

export function timestampForAlipay(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mi = `${date.getMinutes()}`.padStart(2, "0");
  const ss = `${date.getSeconds()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export function canonicalizeAlipayParams(params: Record<string, string>) {
  return Object.keys(params)
    .sort()
    .filter((key) => params[key] !== "" && key !== "sign")
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

export function signWithRsaSha256(content: string, privateKey: string) {
  const sign = createSign("RSA-SHA256");
  sign.update(content, "utf8");
  sign.end();
  return sign.sign(privateKey, "base64");
}

export function verifyWithRsaSha256(content: string, signature: string, publicKey: string) {
  const verify = createVerify("RSA-SHA256");
  verify.update(content, "utf8");
  verify.end();
  return verify.verify(publicKey, signature, "base64");
}

export function createWechatAuthorizationHeader(params: {
  method: string;
  canonicalPath: string;
  body: string;
  mchId: string;
  serialNo: string;
  privateKey: string;
}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = randomBytes(16).toString("hex");
  const message = `${params.method.toUpperCase()}\n${params.canonicalPath}\n${timestamp}\n${nonceStr}\n${params.body}\n`;
  const signature = signWithRsaSha256(message, params.privateKey);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${params.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${params.serialNo}",signature="${signature}"`;
}

export function verifyWechatSignature(params: {
  timestamp: string;
  nonce: string;
  rawBody: string;
  signature: string;
  publicKey: string;
}) {
  const message = `${params.timestamp}\n${params.nonce}\n${params.rawBody}\n`;
  return verifyWithRsaSha256(message, params.signature, params.publicKey);
}

export function decryptWechatResource(params: {
  apiV3Key: string;
  nonce: string;
  associatedData?: string;
  ciphertext: string;
}) {
  const key = Buffer.from(params.apiV3Key, "utf8");
  const payload = Buffer.from(params.ciphertext, "base64");
  const authTag = payload.subarray(payload.length - 16);
  const encrypted = payload.subarray(0, payload.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(params.nonce, "utf8"));
  if (params.associatedData) {
    decipher.setAAD(Buffer.from(params.associatedData, "utf8"));
  }
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString("utf8");
}

export async function createPendingBillingRecord(params: {
  userId: string;
  tier: SubscriptionTier;
  paymentProvider: BillingRecord["paymentProvider"];
  externalSessionId: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const subscription = await getUserSubscription(params.userId);
  return createBillingRecord({
    userId: params.userId,
    subscriptionId: subscription.id,
    paymentProvider: params.paymentProvider,
    tier: params.tier,
    amountCents: amountCentsForTier(params.tier),
    currency: "CNY",
    status: "pending",
    externalSessionId: params.externalSessionId,
    description: params.description,
    metadata: params.metadata,
  });
}

export async function markBillingSucceededAndExtendSubscription(params: {
  userId: string;
  paymentProvider: UserSubscription["paymentProvider"];
  externalSessionId: string;
  externalPaymentId?: string;
  metadata?: Record<string, unknown>;
}) {
  const record = await getBillingRecordByExternalSessionId({
    paymentProvider: params.paymentProvider ?? "alipay",
    externalSessionId: params.externalSessionId,
  });
  if (!record) {
    throw new Error("BILLING_RECORD_NOT_FOUND");
  }

  const updated = await updateBillingRecordStatus({
    recordId: record.id,
    status: "succeeded",
    externalPaymentId: params.externalPaymentId ?? null,
    metadata: { ...(record.metadata ?? {}), ...(params.metadata ?? {}) },
    settledAt: new Date(),
  });

  const existing = await getUserSubscription(params.userId);
  const base =
    existing.tier === "pro" &&
    (existing.status === "active" || existing.status === "trialing") &&
    existing.currentPeriodEnd &&
    new Date(existing.currentPeriodEnd).getTime() > Date.now()
      ? new Date(existing.currentPeriodEnd)
      : new Date();
  const nextPeriodEnd = new Date(base);
  nextPeriodEnd.setUTCDate(nextPeriodEnd.getUTCDate() + 30);

  const subscription = await upsertUserSubscription({
    userId: params.userId,
    tier: record.tier,
    status: "active",
    paymentProvider: params.paymentProvider,
    currentPeriodEnd: nextPeriodEnd,
    cancelAtPeriodEnd: false,
  });

  return { record: updated, subscription };
}
