/**
 * Subscription tier definitions, limits, and gate helpers.
 *
 * v8.0 strategy: only Free + Pro (¥29/month) for the current GA path.
 *
 * Core principle: Free users fully experience the community (browse, post,
 * comment, like, join teams). Pro unlocks "more space", "more exposure",
 * and "developer tooling" — it never locks basic social features.
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
  maxTeams: number;
  maxTeamMembers: number;
  maxProjects: number;
  maxScreenshots: number;
  workspaceStorageMb: number;
  maxWorkspaceFileBytes: number;
  maxSnapshots: number;
  maxAgentsPerTeam: number;
  apiRatePerMinute: number;
  maxApiKeys: number;
  canFeatureProject: boolean;
  canPublishMilestone: boolean;
  mcpToolsUnlocked: boolean;
  proBadge: boolean;
  priorityCollabMatch: boolean;
  activityLogExport: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxTeams: 1,
    maxTeamMembers: 5,
    maxProjects: 5,
    maxScreenshots: 3,
    workspaceStorageMb: 256,
    maxWorkspaceFileBytes: 25 * 1024 * 1024,
    maxSnapshots: 20,
    maxAgentsPerTeam: 3,
    apiRatePerMinute: 60,
    maxApiKeys: 2,
    canFeatureProject: false,
    canPublishMilestone: false,
    mcpToolsUnlocked: false,
    proBadge: false,
    priorityCollabMatch: false,
    activityLogExport: false,
  },
  pro: {
    maxTeams: 5,
    maxTeamMembers: 20,
    maxProjects: Infinity,
    maxScreenshots: 10,
    workspaceStorageMb: 5 * 1024,
    maxWorkspaceFileBytes: 250 * 1024 * 1024,
    maxSnapshots: 200,
    maxAgentsPerTeam: 20,
    apiRatePerMinute: 600,
    maxApiKeys: 10,
    canFeatureProject: true,
    canPublishMilestone: true,
    mcpToolsUnlocked: true,
    proBadge: true,
    priorityCollabMatch: true,
    activityLogExport: true,
  },
};

// ─── Pricing (display only) ───────────────────────────────────────────────────

export const TIER_PRICING = {
  free: { label: "免费版", priceMonthly: 0, currency: "CNY" },
  pro: { label: "专业版", priceMonthly: 29, currency: "CNY" },
} satisfies Record<SubscriptionTier, { label: string; priceMonthly: number; currency: string }>;

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
  | "team_limit"
  | "team_member_limit"
  | "project_limit"
  | "screenshot_limit"
  | "feature_project"
  | "publish_milestone"
  | "mcp_tools"
  | "api_key_limit";

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

// ─── Upgrade prompt messages ──────────────────────────────────────────────────

export const UPGRADE_MESSAGES: Record<UpgradeReason, { title: string; body: string }> = {
  team_limit: {
    title: "升级后可创建更多团队",
    body: "免费版最多创建 1 个团队。升级到专业版后最多可创建 5 个团队。",
  },
  team_member_limit: {
    title: "团队成员数量已达上限",
    body: "免费版每个团队最多支持 5 名成员。升级到专业版后最多支持 20 名成员。",
  },
  project_limit: {
    title: "升级后可创建无限项目",
    body: "免费版最多支持 5 个项目。升级到专业版后可使用无限项目。",
  },
  screenshot_limit: {
    title: "升级后可上传更多截图",
    body: "免费版每个项目最多上传 3 张截图。升级到专业版后最多可上传 10 张。",
  },
  feature_project: {
    title: "升级后可申请今日精选",
    body: "专业版用户可以申请今日精选项目位，获得更高曝光。",
  },
  publish_milestone: {
    title: "升级后可公开里程碑",
    body: "专业版用户可以在项目页公开里程碑，吸引协作者加入。",
  },
  mcp_tools: {
    title: "升级后可解锁全部 MCP 工具",
    body: "免费版包含 5 个基础 MCP 工具。升级到专业版后可使用全部 9 个工具。",
  },
  api_key_limit: {
    title: "升级后可创建更多 API 密钥",
    body: "免费版最多支持 2 个 API 密钥。升级到专业版后最多可创建 10 个。",
  },
};
