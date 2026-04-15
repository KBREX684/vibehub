import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { getAdminOverview } from "@/lib/repository";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const overview = await getAdminOverview();
    return apiSuccess(overview);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "ADMIN_OVERVIEW_FAILED",
        message: "Failed to load admin overview",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}