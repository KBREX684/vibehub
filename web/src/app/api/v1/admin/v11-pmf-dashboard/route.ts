import { apiError, apiSuccess } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { getV11PmfDashboard } from "@/lib/repositories/pmf.repository";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  const rawWindowDays = new URL(request.url).searchParams.get("windowDays");
  const windowDays = rawWindowDays ? Number(rawWindowDays) : 30;
  if (!Number.isFinite(windowDays) || windowDays < 1 || windowDays > 365) {
    return apiError({ code: "INVALID_WINDOW", message: "windowDays must be between 1 and 365" }, 400);
  }

  try {
    const dashboard = await getV11PmfDashboard(windowDays);
    return apiSuccess({ dashboard });
  } catch (error) {
    return apiError(
      {
        code: "PMF_DASHBOARD_FAILED",
        message: error instanceof Error ? error.message : "Failed to load PMF dashboard",
      },
      500
    );
  }
}
