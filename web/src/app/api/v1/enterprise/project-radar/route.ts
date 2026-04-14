import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { hasApprovedEnterpriseAccess } from "@/lib/enterprise-access";
import { getProjectRadar } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read:enterprise:workspace");
  const gate = resolveReadAuth(auth, false);
  if (!gate.ok) {
    if (gate.status === 429) return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key with read:enterprise:workspace required" }, 401);
  }

  const user = gate.user!;
  if (!hasApprovedEnterpriseAccess({ role: user.role, enterpriseStatus: user.enterpriseStatus })) {
    return apiError(
      {
        code: "ENTERPRISE_ACCESS_DENIED",
        message: "Enterprise verification must be approved to access this resource",
      },
      403
    );
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1), 100);
    const radar = await getProjectRadar(limit);
    return apiSuccess(radar);
  } catch (error) {
    return apiError(
      { code: "PROJECT_RADAR_FAILED", message: "Failed to fetch project radar", details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}
