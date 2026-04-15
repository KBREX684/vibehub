import { getSubscriptionPlans } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

export async function GET() {
  try {
    const plans = await getSubscriptionPlans();
    return apiSuccess(plans);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    return apiError(
      {
        code: "PLANS_FETCH_FAILED",
        message: "Failed to fetch subscription plans",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}