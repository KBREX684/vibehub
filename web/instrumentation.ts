/**
 * P3-BE-1: start pg-boss webhook workers in the Node.js runtime (not Edge).
 * P4-BE-1: telemetry module (src/lib/telemetry/) is available for in-memory
 *   metrics collection and system health checks — no extra init required here.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { assertProductionEnv } = await import("@/lib/env-check");
    assertProductionEnv();
    const { startWebhookWorkers } = await import("@/lib/queue/boss");
    await startWebhookWorkers();
    const { startCreditWorkers } = await import("@/lib/queue/credit-queue");
    await startCreditWorkers();
  } catch (e) {
    const { logger, serializeError } = await import("@/lib/logger");
    logger.error({ err: serializeError(e) }, "[instrumentation] bootstrap failed");
    throw e;
  }
}
