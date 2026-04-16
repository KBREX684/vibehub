import { z } from "zod";
import type { NextRequest } from "next/server";
import { getSessionUserFromCookie } from "@/lib/auth";
import { createUserWebhook, listUserWebhooks } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const createSchema = z.object({
  url: z.string().url().min(8),
  events: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const items = await listUserWebhooks(session.userId);
    return apiSuccess({ webhooks: items });
  } catch (e) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(e);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    return apiError(
      {
        code: "WEBHOOK_LIST_FAILED",
        message: "Failed to list webhooks",
        details: safeServerErrorDetails(e),
      },
      500
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const json = await request.json();
    const parsed = createSchema.parse(json);
    if (!/^https:\/\//i.test(parsed.url)) {
      return apiError({ code: "INVALID_WEBHOOK_URL", message: "URL must use https://" }, 400);
    }
    const created = await createUserWebhook({
      userId: session.userId,
      url: parsed.url,
      events: parsed.events ?? [],
    });
    return apiSuccess(created, 201);
  } catch (e) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(e);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (e instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: e.flatten() }, 400);
    }
    const msg = e instanceof Error ? e.message : String(e);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    return apiError(
      { code: "WEBHOOK_CREATE_FAILED", message: "Failed to create webhook", details: safeServerErrorDetails(e) },
      500
    );
  }
}