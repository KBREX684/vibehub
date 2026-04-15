import { z } from "zod";
import type { NextRequest } from "next/server";
import { getSessionUserFromCookie } from "@/lib/auth";
import { deleteUserWebhook, updateUserWebhook } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const patchSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

interface Params {
  params: Promise<{ webhookId: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  const { webhookId } = await params;
  try {
    const json = await request.json();
    const parsed = patchSchema.parse(json);
    if (parsed.url && !/^https:\/\//i.test(parsed.url)) {
      return apiError({ code: "INVALID_WEBHOOK_URL", message: "URL must use https://" }, 400);
    }
    const updated = await updateUserWebhook({
      userId: session.userId,
      webhookId,
      url: parsed.url,
      events: parsed.events,
      active: parsed.active,
    });
    return apiSuccess(updated);
  } catch (e) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(e);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (e instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: e.flatten() }, 400);
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "WEBHOOK_NOT_FOUND") return apiError({ code: "WEBHOOK_NOT_FOUND", message: msg }, 404);
    if (msg === "INVALID_WEBHOOK_URL" || msg === "INVALID_WEBHOOK_EVENT") {
      return apiError({ code: msg === "INVALID_WEBHOOK_URL" ? "INVALID_WEBHOOK_URL" : "INVALID_WEBHOOK_EVENT", message: msg }, 400);
    }
    if (msg === "WEBHOOK_URL_BLOCKED") {
      return apiError(
        { code: "WEBHOOK_URL_BLOCKED", message: "Webhook URL must be a public HTTPS endpoint (private IPs and localhost are not allowed)." },
        400
      );
    }
    return apiError(
      { code: "WEBHOOK_UPDATE_FAILED", message: "Failed to update webhook", details: safeServerErrorDetails(e) },
      500
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  const { webhookId } = await params;
  try {
    await deleteUserWebhook({ userId: session.userId, webhookId });
    return apiSuccess({ deleted: true });
  } catch (e) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(e);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const msg = e instanceof Error ? e.message : String(e);
    if (msg === "WEBHOOK_NOT_FOUND") return apiError({ code: "WEBHOOK_NOT_FOUND", message: msg }, 404);
    return apiError(
      { code: "WEBHOOK_DELETE_FAILED", message: "Failed to delete webhook", details: safeServerErrorDetails(e) },
      500
    );
  }
}