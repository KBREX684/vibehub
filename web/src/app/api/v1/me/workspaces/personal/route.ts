import { getSessionUserFromCookie } from "@/lib/auth";
import { getPersonalWorkspaceOverview } from "@/lib/repositories/opc-profile.repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const overview = await getPersonalWorkspaceOverview(session.userId);
    return apiSuccess(overview);
  } catch (error) {
    return (
      apiErrorFromRepositoryCatch(error) ??
      apiError(
        {
          code: "PERSONAL_WORKSPACE_OVERVIEW_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      )
    );
  }
}
