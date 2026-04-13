import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { listInAppNotifications, markInAppNotificationsRead } from "@/lib/repository";

export async function GET(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }
  try {
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "1" || url.searchParams.get("unread") === "true";
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;
    const items = await listInAppNotifications({
      userId: session.userId,
      unreadOnly,
      limit: Number.isFinite(limit as number) ? (limit as number) : undefined,
    });
    return apiSuccess({ notifications: items });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return apiError({ code: "NOTIFICATIONS_LIST_FAILED", message: "Failed to list notifications", details: msg }, 500);
  }
}

const patchSchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
  markAll: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }
  try {
    const json = await request.json();
    const parsed = patchSchema.parse(json);
    if (!parsed.markAll && (!parsed.ids || parsed.ids.length === 0)) {
      return apiError({ code: "INVALID_BODY", message: "Provide ids or markAll: true" }, 400);
    }
    const result = await markInAppNotificationsRead({
      userId: session.userId,
      ids: parsed.ids,
      markAll: parsed.markAll,
    });
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    const msg = error instanceof Error ? error.message : String(error);
    return apiError({ code: "NOTIFICATIONS_UPDATE_FAILED", message: "Failed to update notifications", details: msg }, 500);
  }
}
