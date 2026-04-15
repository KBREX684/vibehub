/**
 * POST /api/v1/admin/cleanup
 *
 * Admin-only endpoint to trigger data retention cleanup:
 *   - Comments older than COMMENT_RETAIN_DAYS (default 0 = disabled/long-term)
 *   - Team chat messages older than CHAT_RETAIN_DAYS (default 30 days)
 *
 * Can be called from a cron job, CI pipeline, or the admin dashboard.
 * Also auto-triggered (non-blocking) on comment list and chat list requests.
 */

import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getRequestLogger, serializeError } from "@/lib/logger";
import { readJsonObjectBodyOrEmpty } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import {
  pruneOldComments,
  pruneOldTeamChatMessages,
  commentRetentionCutoff,
  chatRetentionCutoff,
} from "@/lib/repository";

const cleanupBodySchema = z.object({}).strict();

export async function POST(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session || session.role !== "admin") {
    return apiError({ code: "FORBIDDEN", message: "Admin only" }, 403);
  }

  const parsed = await readJsonObjectBodyOrEmpty(request);
  if (!parsed.ok) return parsed.response;
  const zod = cleanupBodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);

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
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const log = getRequestLogger(request, { route: "POST /api/v1/admin/cleanup" });
    log.error({ err: serializeError(err) }, "admin cleanup failed");
    return apiError(
      {
        code: "CLEANUP_FAILED",
        message: "Cleanup failed",
      },
      500
    );
  }
}