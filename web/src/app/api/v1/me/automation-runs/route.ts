import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { safeServerErrorDetails } from "@/lib/safe-error-details";
import { listUserAutomationRuns } from "@/lib/workflow-automation";

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const runs = await listUserAutomationRuns(session.userId);
    return apiSuccess({ runs });
  } catch (error) {
    return apiError({ code: "AUTOMATION_RUNS_LIST_FAILED", message: "Failed to list automation runs", details: safeServerErrorDetails(error) }, 500);
  }
}
