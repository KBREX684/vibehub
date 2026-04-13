/**
 * M-1: Subscription tier definitions, limits, and gate helpers.
 *
 * Core principle: Free users can fully experience the community (browse, post,
 * comment, like). Paid tiers unlock "more space" and "more exposure" —
 * they never lock basic features.
 */

export type SubscriptionTier = "free" | "pro" | "team_pro";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing";

// ─── Tier limits ─────────────────────────────────────────────────────────────

export interface TierLimits {
  maxTeams: number;
  maxTeamMembers: number;
  maxProjects: number;
  maxScreenshots: number;
  apiRatePerMinute: number;
  canFeatureProject: boolean;
  canPublishMilestone: boolean;
  mcpToolsUnlocked: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxTeams: 1,
    maxTeamMembers: 5,
    maxProjects: 3,
    maxScreenshots: 2,
    apiRatePerMinute: 120,
    canFeatureProject: false,
    canPublishMilestone: false,
    mcpToolsUnlocked: false,
  },
  pro: {
    maxTeams: 5,
    maxTeamMembers: 20,
    maxProjects: Infinity,
    maxScreenshots: 10,
    apiRatePerMinute: 1000,
    canFeatureProject: true,
    canPublishMilestone: true,
    mcpToolsUnlocked: true,
  },
  team_pro: {
    maxTeams: Infinity,
    maxTeamMembers: Infinity,
    maxProjects: Infinity,
    maxScreenshots: Infinity,
    apiRatePerMinute: 5000,
    canFeatureProject: true,
    canPublishMilestone: true,
    mcpToolsUnlocked: true,
  },
};

// ─── Pricing (display only) ───────────────────────────────────────────────────

export const TIER_PRICING = {
  free: { label: "Free", priceMonthly: 0, currency: "CNY" },
  pro: { label: "Pro", priceMonthly: 29, currency: "CNY" },
  team_pro: { label: "Team Pro", priceMonthly: 99, currency: "CNY" },
} satisfies Record<SubscriptionTier, { label: string; priceMonthly: number; currency: string }>;

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
  | "team_limit"
  | "team_member_limit"
  | "project_limit"
  | "screenshot_limit"
  | "feature_project"
  | "publish_milestone"
  | "mcp_tools";

export function checkTeamLimit(tier: SubscriptionTier, currentTeamCount: number): GateResult {
  const limit = TIER_LIMITS[tier].maxTeams;
  if (currentTeamCount < limit) return { allowed: true };
  return { allowed: false, upgradeReason: "team_limit" };
}

export function checkProjectLimit(tier: SubscriptionTier, currentProjectCount: number): GateResult {
  const limit = TIER_LIMITS[tier].maxProjects;
  if (currentProjectCount < limit) return { allowed: true };
  return { allowed: false, upgradeReason: "project_limit" };
}

export function checkScreenshotLimit(tier: SubscriptionTier, screenshotCount: number): GateResult {
  const limit = TIER_LIMITS[tier].maxScreenshots;
  if (screenshotCount <= limit) return { allowed: true };
  return { allowed: false, upgradeReason: "screenshot_limit" };
}

export function checkTeamMemberLimit(tier: SubscriptionTier, currentMemberCount: number): GateResult {
  const limit = TIER_LIMITS[tier].maxTeamMembers;
  if (currentMemberCount < limit) return { allowed: true };
  return { allowed: false, upgradeReason: "team_member_limit" };
}

/** Returns the usage percentage (0–100) to trigger soft upgrade prompts at 80%+. */
export function getApiRateUsagePercent(tier: SubscriptionTier, usedThisMinute: number): number {
  const max = TIER_LIMITS[tier].apiRatePerMinute;
  return Math.min(100, Math.round((usedThisMinute / max) * 100));
}

// ─── Upgrade prompt messages ──────────────────────────────────────────────────

export const UPGRADE_MESSAGES: Record<UpgradeReason, { title: string; body: string }> = {
  team_limit: {
    title: "升级解锁更多团队",
    body: "Free 方案最多创建 1 个团队。升级到 Pro（¥29/月）可创建 5 个团队，Team Pro 无限制。",
  },
  team_member_limit: {
    title: "团队已达成员上限",
    body: "Free 方案每个团队最多 5 名成员。升级到 Pro 可扩展至 20 人，Team Pro 无上限。",
  },
  project_limit: {
    title: "升级解锁无限项目",
    body: "Free 方案最多创建 3 个项目。升级到 Pro（¥29/月）可创建无限项目。",
  },
  screenshot_limit: {
    title: "升级解锁更多截图",
    body: "Free 方案每个项目最多 2 张截图。升级到 Pro（¥29/月）可上传 10 张，Team Pro 无限制。",
  },
  feature_project: {
    title: "升级后可申请每日展示位",
    body: "Pro 及以上方案可为项目申请每日精选展示位，获得最大曝光。",
  },
  publish_milestone: {
    title: "升级后可公开里程碑",
    body: "Pro 及以上方案可将里程碑设为公开，在项目页展示进度，吸引投资者和协作者。",
  },
  mcp_tools: {
    title: "升级解锁全部 MCP 工具",
    body: "Free 方案提供基础 5 个 MCP 工具。升级到 Pro 解锁全部 9 个工具，让 AI 助手更强大。",
  },
};
