/**
 * Subscription tier definitions, limits, and gate helpers.
 *
 * v11.0 strategy: Free + Pro (¥29/month or ¥288/year).
 * Focus: AI 操作公证账本 (Ledger). No team/enterprise tiers.
 *
 * Free users get 1 Personal Workspace, basic AIGC stamping, and a public Trust Card.
 * Pro unlocks unlimited Ledger, full AIGC stamping (Tencent/Aliyun), legal chain anchoring,
 * monthly compliance reports, and advanced Trust Card.
 */

export type SubscriptionTier = "free" | "pro";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing";
export interface SubscriptionEntitlementLike {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd?: string | Date | null;
}

// ─── Tier limits ─────────────────────────────────────────────────────────────

export interface TierLimits {
  maxStorageGb: number;
  maxLedgerPerMonth: number;
  maxApiKeys: number;
  apiRatePerMinute: number;
  aigcStampProvider: "local" | "full";
  ledgerAnchorChain: false | ("zhixin" | "baoquan")[];
  complianceReportExport: boolean;
  trustCardAdvanced: boolean;
  vibehubVerifyCli: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxStorageGb: 1,
    maxLedgerPerMonth: 100,
    maxApiKeys: 2,
    apiRatePerMinute: 60,
    aigcStampProvider: "local",
    ledgerAnchorChain: false,
    complianceReportExport: false,
    trustCardAdvanced: false,
    vibehubVerifyCli: true,
  },
  pro: {
    maxStorageGb: 10,
    maxLedgerPerMonth: Infinity,
    maxApiKeys: 10,
    apiRatePerMinute: 600,
    aigcStampProvider: "full",
    ledgerAnchorChain: ["zhixin", "baoquan"],
    complianceReportExport: true,
    trustCardAdvanced: true,
    vibehubVerifyCli: true,
  },
};

// ─── Pricing (display only) ───────────────────────────────────────────────────

export const TIER_PRICING = {
  free: { label: "Free", priceMonthly: 0, priceYearly: 0, currency: "CNY" },
  pro: { label: "Pro", priceMonthly: 29, priceYearly: 288, currency: "CNY" },
} satisfies Record<SubscriptionTier, { label: string; priceMonthly: number; priceYearly: number; currency: string }>;

export function resolveEntitledTier(subscription: SubscriptionEntitlementLike): SubscriptionTier {
  if (subscription.tier === "free") return "free";
  if (!(subscription.status === "active" || subscription.status === "trialing")) return "free";
  if (!subscription.currentPeriodEnd) return subscription.tier;
  const end = subscription.currentPeriodEnd instanceof Date ? subscription.currentPeriodEnd : new Date(subscription.currentPeriodEnd);
  if (Number.isNaN(end.getTime())) return subscription.tier;
  return end.getTime() > Date.now() ? subscription.tier : "free";
}

export function formatTierPrice(tier: SubscriptionTier, language: "en" | "zh" | string = "zh") {
  const pricing = TIER_PRICING[tier];
  if (pricing.priceMonthly === 0) return language === "zh" ? "免费" : "Free";
  return language === "zh" ? `¥${pricing.priceMonthly}/月` : `¥${pricing.priceMonthly}/mo`;
}

// ─── Gate helpers ─────────────────────────────────────────────────────────────

export function getLimits(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier];
}

export interface GateResult {
  allowed: boolean;
  /** Present when not allowed — describes what upgrade unlocks this. */
  upgradeReason?: UpgradeReason;
}

export type UpgradeReason =
  | "ledger_anchor"
  | "aigc_stamp_full"
  | "trust_card_advanced"
  | "compliance_report"
  | "storage_limit"
  | "api_key_limit"
  | "ledger_monthly_limit";

export function checkStorageLimit(tier: SubscriptionTier, usedGb: number): GateResult {
  const limit = TIER_LIMITS[tier].maxStorageGb;
  if (usedGb < limit) return { allowed: true };
  return { allowed: false, upgradeReason: "storage_limit" };
}

export function checkLedgerMonthlyLimit(tier: SubscriptionTier, currentCount: number): GateResult {
  const limit = TIER_LIMITS[tier].maxLedgerPerMonth;
  if (currentCount < limit) return { allowed: true };
  return { allowed: false, upgradeReason: "ledger_monthly_limit" };
}

export function checkApiKeyLimit(tier: SubscriptionTier, currentKeyCount: number): GateResult {
  const limit = TIER_LIMITS[tier].maxApiKeys;
  if (currentKeyCount < limit) return { allowed: true };
  return { allowed: false, upgradeReason: "api_key_limit" };
}

/** Returns the usage percentage (0–100) to trigger soft upgrade prompts at 80%+. */
export function getApiRateUsagePercent(tier: SubscriptionTier, usedThisMinute: number): number {
  const max = TIER_LIMITS[tier].apiRatePerMinute;
  return Math.min(100, Math.round((usedThisMinute / max) * 100));
}

// ─── Deprecated gate helpers (kept for backend compat; always allowed in v11) ──

/** @deprecated v11 removes teams. Always returns allowed. */
export function checkTeamLimit(_tier: SubscriptionTier, _currentTeamCount: number): GateResult {
  return { allowed: true };
}

/** @deprecated v11 removes team members. Always returns allowed. */
export function checkTeamMemberLimit(_tier: SubscriptionTier, _currentMemberCount: number): GateResult {
  return { allowed: true };
}

/** @deprecated v11 removes project limits. Always returns allowed. */
export function checkProjectLimit(_tier: SubscriptionTier, _currentProjectCount: number): GateResult {
  return { allowed: true };
}

/** @deprecated v11 removes screenshot limits. Always returns allowed. */
export function checkScreenshotLimit(_tier: SubscriptionTier, _screenshotCount: number): GateResult {
  return { allowed: true };
}

// ─── Upgrade prompt messages ──────────────────────────────────────────────────

export const UPGRADE_MESSAGES: Record<UpgradeReason, { title: string; body: string }> = {
  ledger_anchor: {
    title: "锚定到司法链是 Pro 功能",
    body: "升级 Pro 后，每月可锚定无限条 Ledger 到至信链/保全网，为你的 AI 工作背书。",
  },
  aigc_stamp_full: {
    title: "完整 AIGC 标识需要 Pro",
    body: "Free 用户使用本地模式标识。升级 Pro 解锁腾讯云/阿里云 AIGC 标识 API。",
  },
  trust_card_advanced: {
    title: "高级 Trust Card 需要 Pro",
    body: "升级 Pro 解锁自定义域名、历史合作脱敏展示等高级 Trust Card 功能。",
  },
  compliance_report: {
    title: "月度合规报告需要 Pro",
    body: "升级 Pro 后可导出 GB 45438-2025 格式月度合规报告 PDF。",
  },
  storage_limit: {
    title: "存储空间不足",
    body: "Free 用户 1 GB 存储。升级 Pro 获得 10 GB。",
  },
  api_key_limit: {
    title: "API 密钥数量已达上限",
    body: "Free 用户 2 个 API 密钥。升级 Pro 获得最多 10 个。",
  },
  ledger_monthly_limit: {
    title: "本月 Ledger 条数已达上限",
    body: "Free 用户每月 100 条 Ledger。升级 Pro 获得无限 Ledger。",
  },
};
