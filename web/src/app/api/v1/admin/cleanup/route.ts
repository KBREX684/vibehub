/**
 * POST /api/v1/admin/cleanup
 *
 * Admin-only endpoint to trigger data retention cleanup:
 *   - Comments older than COMMENT_RETAIN_DAYS (default 7)
 *   - Team chat messages older than CHAT_RETAIN_DAYS (default 7)
 *
 * Can be called from a cron job, CI pipeline, or the admin dashboard.
 * Also auto-triggered (non-blocking) on comment list and chat list requests.
 */

import { apiError, apiSuccess } from "@/lib/response";
import { getSessionUserFromCookie } from "@/lib/auth";
import {
  pruneOldComments,
  pruneOldTeamChatMessages,
  commentRetentionCutoff,
  chatRetentionCutoff,
} from "@/lib/repository";

export async function POST() {
  const session = await getSessionUserFromCookie();
  if (!session || session.role !== "admin") {
    return apiError({ code: "FORBIDDEN", message: "Admin only" }, 403);
  }

  try {
    const [deletedComments, deletedChatMessages] = await Promise.all([
      pruneOldComments(),
      pruneOldTeamChatMessages(),
    ]);

    return apiSuccess({
      deletedComments,
      deletedChatMessages,
      commentRetainedSince:  commentRetentionCutoff().toISOString(),
      chatRetainedSince:     chatRetentionCutoff().toISOString(),
    });
  } catch (err) {
    return apiError(
      {
        code: "CLEANUP_FAILED",
        message: "Cleanup failed",
        details: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
}
