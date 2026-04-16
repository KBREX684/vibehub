import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { listInAppNotifications, markInAppNotificationsRead } from "@/lib/repository";
import { getRequestLogger, serializeError } from "@/lib/logger";
import { safeParseIntParam } from "@/lib/safe-parse-int-param";

export async function GET(request: Request) {
  const requestLogger = getRequestLogger(request, { route: "/api/v1/me/notifications" });
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }
  try {
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "1" || url.searchParams.get("unread") === "true";
    const limitRaw = url.searchParams.get("limit");
    const safeLimit = limitRaw != null ? safeParseIntParam(limitRaw, 50, 1, 500) : undefined;
    const items = await listInAppNotifications({
      userId: session.userId,
      unreadOnly,
      limit: safeLimit,
    });
    return apiSuccess({ notifications: items });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    requestLogger.error({ err: serializeError(error) }, "Failed to list notifications");
    return apiError({ code: "NOTIFICATIONS_LIST_FAILED", message: "Failed to list notifications" }, 500);
  }
}

const patchSchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
  markAll: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const requestLogger = getRequestLogger(request, { route: "/api/v1/me/notifications" });
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
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    requestLogger.error({ err: serializeError(error) }, "Failed to update notifications");
    return apiError({ code: "NOTIFICATIONS_UPDATE_FAILED", message: "Failed to update notifications" }, 500);
  }
}

export async function PUT(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("stream") === "1") {
    const session = await getSessionUserFromCookie();
    if (!session) {
      return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
    }
    const requestLogger = getRequestLogger(request, { route: "/api/v1/me/notifications?stream=1" });
    const encoder = new TextEncoder();
    const frame = (payload: unknown) => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
    const sseEvent = (event: string, payload: unknown) =>
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    const keepalive = () => encoder.encode(`: keepalive\n\n`);
    const pollMsRaw = process.env.NOTIFICATIONS_SSE_POLL_MS?.trim();
    const pollMsParsed = pollMsRaw ? Number.parseInt(pollMsRaw, 10) : 15_000;
    const pollMs = Number.isFinite(pollMsParsed) && pollMsParsed > 1000 ? pollMsParsed : 15_000;

    // Max stream duration: 10 minutes (configurable)
    const maxDurationMsRaw = process.env.NOTIFICATIONS_SSE_MAX_DURATION_MS?.trim();
    const maxDurationParsed = maxDurationMsRaw ? Number.parseInt(maxDurationMsRaw, 10) : 600_000;
    const maxDurationMs = Number.isFinite(maxDurationParsed) && maxDurationParsed > 0 ? maxDurationParsed : 600_000;

    // Max consecutive errors before closing
    const MAX_CONSECUTIVE_ERRORS = 5;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        let consecutiveErrors = 0;
        const startTime = Date.now();

        const safeClose = () => {
          if (closed) return;
          closed = true;
          try {
            controller.close();
          } catch {
            // noop
          }
        };

        const safeEnqueue = (chunk: Uint8Array) => {
          if (closed) return;
          try {
            controller.enqueue(chunk);
          } catch {
            safeClose();
          }
        };

        const pushUnread = async () => {
          if (closed) return;

          // Check max duration
          if (Date.now() - startTime >= maxDurationMs) {
            safeEnqueue(sseEvent("timeout", { message: "Stream duration limit reached, please reconnect", ts: Date.now() }));
            cleanup();
            return;
          }

          try {
            const items = await listInAppNotifications({
              userId: session.userId,
              unreadOnly: true,
              limit: 200,
            });
            consecutiveErrors = 0;
            safeEnqueue(frame({ unreadCount: items.length, ts: Date.now() }));
          } catch (error) {
            consecutiveErrors++;
            requestLogger.error({ err: serializeError(error), consecutiveErrors }, "Failed to fetch notification stream snapshot");
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
              safeEnqueue(sseEvent("error", { message: "Too many consecutive errors, closing stream", ts: Date.now() }));
              cleanup();
              return;
            }
            safeEnqueue(frame({ unreadCount: 0, ts: Date.now() }));
          }
        };

        // Keepalive: send SSE comment every 30s to prevent proxy/LB timeouts
        const keepaliveTimer = setInterval(() => {
          safeEnqueue(keepalive());
        }, 30_000);

        await pushUnread();
        const pollTimer = setInterval(() => {
          void pushUnread();
        }, pollMs);

        const cleanup = () => {
          clearInterval(pollTimer);
          clearInterval(keepaliveTimer);
          safeClose();
        };

        request.signal.addEventListener("abort", cleanup);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }
  return PATCH(request.clone());
}