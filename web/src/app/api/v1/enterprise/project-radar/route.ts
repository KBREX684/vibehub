import type { NextRequest } from "next/server";
import {
  allowLightEnterpriseDataRead,
  authenticateRequest,
  rateLimitedResponse,
  resolveReadAuth,
} from "@/lib/auth";
import { getProjectRadar } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  const gate = resolveReadAuth(auth, false);
  if (!gate.ok) {
    if (gate.status === 429) return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key required" }, 401);
  }
  if (!allowLightEnterpriseDataRead(gate.user!)) {
    return apiError(
      {
        code: "FORBIDDEN",
        message: "API key must include read:public or read:enterprise:workspace for this endpoint",
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
