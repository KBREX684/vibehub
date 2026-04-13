import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { getProjectDueDiligence } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "read:enterprise:workspace");
  const gate = resolveReadAuth(auth, false);
  if (!gate.ok) {
    if (gate.status === 429) return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key with read:enterprise:workspace required" }, 401);
  }

  try {
    const { slug } = await params;
    const dd = await getProjectDueDiligence(slug);
    if (!dd) {
      return apiError({ code: "PROJECT_NOT_FOUND", message: `Project "${slug}" not found` }, 404);
    }
    return apiSuccess(dd);
  } catch (error) {
    return apiError(
      { code: "DUE_DILIGENCE_FAILED", message: "Failed to fetch due diligence", details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}
