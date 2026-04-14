import type { EnterpriseVerificationStatus } from "@/lib/types";

/**
 * Enterprise-only APIs (radar, due diligence, workspace summary, ecosystem reports)
 * require the viewer to have completed enterprise verification (approved).
 * Admins may access for operational support.
 */
export function hasApprovedEnterpriseAccess(params: {
  role: "guest" | "user" | "admin";
  enterpriseStatus?: EnterpriseVerificationStatus;
}): boolean {
  if (params.role === "admin") {
    return true;
  }
  return params.enterpriseStatus === "approved";
}
