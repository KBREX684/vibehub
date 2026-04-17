import { getRequestLogger, serializeError } from "@/lib/logger";
import { emitSystemAlert } from "@/lib/system-alerts";

export async function withRequestLogging(
  request: Request,
  options: {
    route: string;
    bindings?: Record<string, unknown>;
    alertOn5xx?: { kind: string; dedupeKey: string };
  },
  handler: (ctx: {
    log: ReturnType<typeof getRequestLogger>;
    startedAt: number;
  }) => Promise<Response>
): Promise<Response> {
  const startedAt = Date.now();
  const log = getRequestLogger(request, { route: options.route, ...options.bindings });
  try {
    const response = await handler({ log, startedAt });
    if (response.status >= 500 && options.alertOn5xx) {
      await emitSystemAlert({
        kind: options.alertOn5xx.kind,
        severity: "warning",
        message: `Route ${options.route} returned ${response.status}.`,
        dedupeKey: options.alertOn5xx.dedupeKey,
        metadata: { route: options.route, status: response.status },
      });
    }
    log.info({ status: response.status, durationMs: Date.now() - startedAt }, "request completed");
    return response;
  } catch (error) {
    if (options.alertOn5xx) {
      await emitSystemAlert({
        kind: options.alertOn5xx.kind,
        severity: "critical",
        message: `Route ${options.route} threw before responding.`,
        dedupeKey: options.alertOn5xx.dedupeKey,
        metadata: { route: options.route, error: error instanceof Error ? error.message : String(error) },
      });
    }
    log.error({ err: serializeError(error), durationMs: Date.now() - startedAt }, "request failed");
    throw error;
  }
}
