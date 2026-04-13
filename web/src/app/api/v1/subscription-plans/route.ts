import { getSubscriptionPlans } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

export async function GET() {
  try {
    const plans = await getSubscriptionPlans();
    return apiSuccess(plans);
  } catch (error) {
    return apiError(
      { code: "PLANS_FETCH_FAILED", message: "Failed to fetch subscription plans", details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}
