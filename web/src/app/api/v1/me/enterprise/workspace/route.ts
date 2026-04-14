import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { hasApprovedEnterpriseAccess } from "@/lib/enterprise-access";
import { apiError, apiSuccess } from "@/lib/response";
import { getEnterpriseWorkspaceSummary } from "@/lib/repository";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read:enterprise:workspace");
  const gate = resolveReadAuth(auth, false);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError(
      { code: "UNAUTHORIZED", message: "Session or API key with read:enterprise:workspace required" },
      401
    );
  }
  const session = gate.user!;
  if (!hasApprovedEnterpriseAccess({ role: session.role, enterpriseStatus: session.enterpriseStatus })) {
    return apiError(
      {
        code: "ENTERPRISE_ACCESS_DENIED",
        message: "Enterprise verification must be approved to access this resource",
      },
      403
    );
  }
  try {
    const summary = await getEnterpriseWorkspaceSummary({ viewerUserId: session.userId });
    return apiSuccess(summary);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return apiError(
      { code: "ENTERPRISE_WORKSPACE_FAILED", message: "Failed to load workspace summary", details: msg },
      500
    );
  }
}
