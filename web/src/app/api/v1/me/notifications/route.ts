import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { listInAppNotifications, markInAppNotificationsRead } from "@/lib/repository";
import { getRequestLogger, serializeError } from "@/lib/logger";

async function streamUnreadNotifications(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const requestLogger = getRequestLogger(request, { route: "/api/v1/me/notifications?stream=1" });
  const encoder = new TextEncoder();
  const frame = (payload: unknown) => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
  const pollMsRaw = process.env.NOTIFICATIONS_SSE_POLL_MS?.trim();
  const pollMsParsed = pollMsRaw ? Number.parseInt(pollMsRaw, 10) : 15_000;
  const pollMs = Number.isFinite(pollMsParsed) && pollMsParsed > 1000 ? pollMsParsed : 15_000;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeClose = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // noop
        }
      };

      const pushUnread = async () => {
        try {
          const items = await listInAppNotifications({
            userId: session.userId,
            unreadOnly: true,
            limit: 200,
          });
          controller.enqueue(frame({ unreadCount: items.length, ts: Date.now() }));
        } catch (error) {
          requestLogger.error({ err: serializeError(error) }, "Failed to fetch notification stream snapshot");
          controller.enqueue(frame({ unreadCount: 0, ts: Date.now() }));
        }
      };

      await pushUnread();
      const timer = setInterval(() => {
        void pushUnread();
      }, pollMs);

      request.signal.addEventListener("abort", () => {
        clearInterval(timer);
        safeClose();
      });
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("stream") === "1") {
    return streamUnreadNotifications(request);
  }

  const requestLogger = getRequestLogger(request, { route: "/api/v1/me/notifications" });
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }
  try {
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
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = error instanceof Error ? error.message : String(error);
    requestLogger.error({ err: serializeError(error) }, "Failed to list notifications");
    return apiError({ code: "NOTIFICATIONS_LIST_FAILED", message: "Failed to list notifications", details: msg }, 500);
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
    const msg = error instanceof Error ? error.message : String(error);
    requestLogger.error({ err: serializeError(error) }, "Failed to update notifications");
    return apiError({ code: "NOTIFICATIONS_UPDATE_FAILED", message: "Failed to update notifications", details: msg }, 500);
  }
}

export async function PUT(request: Request) {
  return PATCH(request.clone());
}
