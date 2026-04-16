import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { readJsonObjectBodyOrEmpty } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { getRequestLogger, serializeError } from "@/lib/logger";
import { getPaymentProvider } from "@/lib/billing/payment-provider";
import { getUserSubscription } from "@/lib/repositories/billing.repository";

const useMockData = isMockDataEnabled();

const portalBodySchema = z.object({
  returnUrl: z.string().url().optional(),
});

/** M-2: Create a Stripe Customer Portal session for managing/canceling subscriptions. */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  try {
    const parsed = await readJsonObjectBodyOrEmpty(request);
    if (!parsed.ok) return parsed.response;
    const zod = portalBodySchema.safeParse(parsed.body);
    if (!zod.success) return apiErrorFromZod(zod.error);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const returnUrl = zod.data.returnUrl ?? `${baseUrl}/settings/subscription`;
    const subscription = await getUserSubscription(auth.user.userId);
    const provider = getPaymentProvider(subscription.paymentProvider ?? "stripe");

    if (subscription.paymentProvider !== "stripe") {
      const session = await provider.createPortalSession("manual", returnUrl);
      return apiSuccess({ url: session.url, paymentProvider: subscription.paymentProvider ?? "stripe" });
    }

    const { prisma } = await import("@/lib/db");
    const user = await prisma.user.findUnique({ where: { id: auth.user.userId }, select: { stripeCustomerId: true } });
    if (!user?.stripeCustomerId) {
      if (useMockData) {
        return apiSuccess({
          url: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}portal=mock`,
          paymentProvider: "stripe",
        });
      }
      return apiError({ code: "NO_STRIPE_CUSTOMER", message: "No billing account found. Please subscribe first." }, 404);
    }

    const session = await provider.createPortalSession(user.stripeCustomerId, returnUrl);

    return apiSuccess({ url: session.url, paymentProvider: "stripe" });
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const log = getRequestLogger(request, { route: "POST /api/v1/billing/portal" });
    log.error({ err: serializeError(err) }, "billing portal failed");
    return apiError({ code: "PORTAL_FAILED", message: "Could not open billing portal" }, 500);
  }
}
