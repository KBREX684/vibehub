import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import {
  getBillingRecordByIdForUser,
  getUserSubscription,
  updateBillingRecordStatus,
  upsertUserSubscription,
} from "@/lib/repositories/billing.repository";

const bodySchema = z.object({
  action: z.enum(["succeed", "fail", "cancel", "refund"]),
  failureReason: z.string().max(200).optional(),
});

interface Params {
  params: Promise<{ recordId: string }>;
}

function addDays(days: number) {
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { recordId } = await params;
    const parsed = bodySchema.parse(await request.json());
    const record = await getBillingRecordByIdForUser({ recordId, userId: session.userId });
    if (!record) {
      return apiError({ code: "BILLING_RECORD_NOT_FOUND", message: "Billing record not found" }, 404);
    }

    if (record.paymentProvider === "stripe") {
      return apiError({ code: "SANDBOX_ONLY", message: "Sandbox actions are only available for China payment staging records" }, 400);
    }

    if (parsed.action === "refund" && record.status !== "succeeded") {
      return apiError({ code: "INVALID_BILLING_STATE", message: "Only successful records can be refunded" }, 409);
    }

    if (["succeed", "fail", "cancel"].includes(parsed.action) && record.status !== "pending") {
      return apiError({ code: "INVALID_BILLING_STATE", message: "Only pending records can be updated" }, 409);
    }

    if (parsed.action === "succeed") {
      const updated = await updateBillingRecordStatus({
        recordId: record.id,
        userId: session.userId,
        status: "succeeded",
        externalPaymentId: `${record.paymentProvider}_sandbox_paid_${Date.now()}`,
        settledAt: new Date(),
      });
      await upsertUserSubscription({
        userId: session.userId,
        tier: record.tier,
        status: "active",
        paymentProvider: record.paymentProvider,
        currentPeriodEnd: addDays(30),
        cancelAtPeriodEnd: false,
      });
      return apiSuccess({ record: updated });
    }

    if (parsed.action === "fail") {
      const updated = await updateBillingRecordStatus({
        recordId: record.id,
        userId: session.userId,
        status: "failed",
        failureReason: parsed.failureReason ?? "Sandbox payment failed",
      });
      const subscription = await getUserSubscription(session.userId);
      if (subscription.paymentProvider === record.paymentProvider && subscription.tier !== "free") {
        await upsertUserSubscription({
          userId: session.userId,
          tier: subscription.tier,
          status: "past_due",
          paymentProvider: record.paymentProvider,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          stripePriceId: subscription.stripePriceId,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          currentPeriodEnd: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : undefined,
        });
      }
      return apiSuccess({ record: updated });
    }

    if (parsed.action === "cancel") {
      const updated = await updateBillingRecordStatus({
        recordId: record.id,
        userId: session.userId,
        status: "canceled",
      });
      return apiSuccess({ record: updated });
    }

    const updated = await updateBillingRecordStatus({
      recordId: record.id,
      userId: session.userId,
      status: "refunded",
      refundedAt: new Date(),
    });
    await upsertUserSubscription({
      userId: session.userId,
      tier: "free",
      status: "canceled",
      paymentProvider: record.paymentProvider,
      cancelAtPeriodEnd: false,
    });
    return apiSuccess({ record: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid sandbox action", details: error.flatten() }, 400);
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message === "BILLING_RECORD_NOT_FOUND") {
      return apiError({ code: "BILLING_RECORD_NOT_FOUND", message: "Billing record not found" }, 404);
    }
    return apiError({ code: "SANDBOX_BILLING_UPDATE_FAILED", message }, 500);
  }
}
