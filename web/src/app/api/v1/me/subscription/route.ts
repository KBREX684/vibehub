import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getUserSubscription, createUserSubscription, cancelUserSubscription } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

const subscribeSchema = z.object({
  planTier: z.enum(["free", "pro", "team_pro"]),
});

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const subscription = await getUserSubscription(session.userId);
    return apiSuccess(subscription);
  } catch (error) {
    return apiError(
      { code: "SUBSCRIPTION_FETCH_FAILED", message: "Failed to fetch subscription", details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const json = await request.json();
    const parsed = subscribeSchema.parse(json);
    const subscription = await createUserSubscription({
      userId: session.userId,
      planTier: parsed.planTier,
    });
    return apiSuccess(subscription, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid subscription payload", details: error.flatten() }, 400);
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "PLAN_NOT_FOUND") {
      return apiError({ code: "PLAN_NOT_FOUND", message: "Subscription plan not found" }, 404);
    }
    return apiError(
      { code: "SUBSCRIPTION_CREATE_FAILED", message: "Failed to create subscription", details: msg },
      500
    );
  }
}

export async function DELETE() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    await cancelUserSubscription(session.userId);
    return apiSuccess({ canceled: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "NO_ACTIVE_SUBSCRIPTION") {
      return apiError({ code: "NO_ACTIVE_SUBSCRIPTION", message: "No active subscription to cancel" }, 404);
    }
    return apiError(
      { code: "SUBSCRIPTION_CANCEL_FAILED", message: "Failed to cancel subscription", details: msg },
      500
    );
  }
}
