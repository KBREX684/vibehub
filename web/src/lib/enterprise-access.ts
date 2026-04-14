import type { EnterpriseVerificationStatus } from "@/lib/types";

/**
 * Enterprise-facing radar/workspace access is a product capability, not an
 * extension of platform governance. Platform admins use `/admin/*` for review
 * and moderation; enterprise workspace access requires its own approved status.
 */
export function hasEnterpriseWorkspaceAccess(
  enterpriseStatus?: EnterpriseVerificationStatus
): boolean {
  return enterpriseStatus === "approved";
}
