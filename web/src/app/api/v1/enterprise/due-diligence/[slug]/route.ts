import type { NextRequest } from "next/server";
import {
  allowLightEnterpriseDataRead,
  authenticateRequest,
  rateLimitedResponse,
  resolveReadAuth,
} from "@/lib/auth";
import { getProjectDueDiligence } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
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
    const { slug } = await params;
    const dd = await getProjectDueDiligence(slug);
    if (!dd) {
      return apiError({ code: "PROJECT_NOT_FOUND", message: `Project "${slug}" not found` }, 404);
    }
    return apiSuccess(dd);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      { code: "DUE_DILIGENCE_FAILED", message: "Failed to fetch due diligence", details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}