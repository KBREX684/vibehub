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
  free: { label: "Free", priceMonthly: 0, currency: "CNY" },
  pro: { label: "Pro", priceMonthly: 29, currency: "CNY" },
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
    title: "Upgrade to create more teams",
    body: "Free plan allows 1 team. Upgrade to Pro (¥29/mo) for up to 5 teams.",
  },
  team_member_limit: {
    title: "Team member limit reached",
    body: "Free plan allows 5 members per team. Upgrade to Pro (¥29/mo) for up to 20.",
  },
  project_limit: {
    title: "Upgrade for unlimited projects",
    body: "Free plan allows 5 projects. Upgrade to Pro (¥29/mo) for unlimited projects.",
  },
  screenshot_limit: {
    title: "Upgrade for more screenshots",
    body: "Free plan allows 3 screenshots per project. Upgrade to Pro (¥29/mo) for 10.",
  },
  feature_project: {
    title: "Upgrade to apply for daily featured",
    body: "Pro members can apply for the daily featured project slot for maximum exposure.",
  },
  publish_milestone: {
    title: "Upgrade to publish milestones",
    body: "Pro members can make milestones public on the project page to attract collaborators.",
  },
  mcp_tools: {
    title: "Upgrade to unlock all MCP tools",
    body: "Free plan includes 5 basic MCP tools. Upgrade to Pro (¥29/mo) for all 9 tools.",
  },
  api_key_limit: {
    title: "Upgrade for more API keys",
    body: "Free plan allows 2 API keys. Upgrade to Pro (¥29/mo) for up to 10.",
  },
};
