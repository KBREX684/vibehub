import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { getNotificationPreference, upsertNotificationPreference } from "@/lib/repository";

const patchSchema = z.object({
  commentReplies: z.boolean().optional(),
  teamUpdates: z.boolean().optional(),
  collaborationModeration: z.boolean().optional(),
  systemAnnouncements: z.boolean().optional(),
});

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }
  const prefs = await getNotificationPreference(session.userId);
  return apiSuccess(prefs);
}

export async function PATCH(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }
  try {
    const json = await request.json();
    const parsed = patchSchema.parse(json);
    if (Object.keys(parsed).length === 0) {
      return apiError({ code: "INVALID_BODY", message: "At least one preference field is required" }, 400);
    }
    const prefs = await upsertNotificationPreference(session.userId, parsed);
    return apiSuccess(prefs);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    throw error;
  }
}
