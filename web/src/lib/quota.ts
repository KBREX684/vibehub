import { getLimits, type SubscriptionTier } from "@/lib/subscription";

export type QuotaResource = "storage" | "ledger_monthly" | "api_calls" | "api_keys";

export interface QuotaCheckResult {
  allowed: boolean;
  limit: number;
  tier: SubscriptionTier;
}

/**
 * Server-side subscription quota gate (v11).
 * `currentCount` is the count *before* the new resource is created.
 *
 * Legacy resources ("teams", "projects", "screenshots") are always allowed
 * in v11 since those features are deprecated.
 */
export function checkQuota(
  tier: SubscriptionTier,
  resource: QuotaResource | string,
  currentCount: number
): QuotaCheckResult {
  const limits = getLimits(tier);

  // v11 resources
  if (resource === "storage") {
    const limit = limits.maxStorageGb;
    return { allowed: currentCount < limit, limit, tier };
  }
  if (resource === "ledger_monthly") {
    const limit = limits.maxLedgerPerMonth;
    return { allowed: currentCount < limit, limit, tier };
  }
  if (resource === "api_keys") {
    const limit = limits.maxApiKeys;
    return { allowed: currentCount < limit, limit, tier };
  }

  // Legacy resources always allowed (teams/projects/screenshots deprecated in v11)
  return { allowed: true, limit: Infinity, tier };
}
