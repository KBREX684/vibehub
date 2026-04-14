import { getLimits, type SubscriptionTier } from "@/lib/subscription";

export type QuotaResource = "teams" | "projects" | "screenshots" | "api_calls";

export interface QuotaCheckResult {
  allowed: boolean;
  limit: number;
  tier: SubscriptionTier;
}

/**
 * Server-side subscription quota gate (P2-4).
 * `currentCount` is the count *before* the new resource is created (e.g. existing teams).
 */
export function checkQuota(
  tier: SubscriptionTier,
  resource: QuotaResource,
  currentCount: number
): QuotaCheckResult {
  const limits = getLimits(tier);

  if (resource === "teams") {
    const limit = limits.maxTeams;
    return { allowed: currentCount < limit, limit, tier };
  }
  if (resource === "projects") {
    const limit = limits.maxProjects;
    return { allowed: currentCount < limit, limit, tier };
  }
  if (resource === "screenshots") {
    const limit = limits.maxScreenshots;
    return { allowed: currentCount < limit, limit, tier };
  }
  return { allowed: true, limit: limits.apiRatePerMinute, tier };
}
