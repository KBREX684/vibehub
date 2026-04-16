/**
 * P3-BE-1: start pg-boss webhook workers in the Node.js runtime (not Edge).
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { assertProductionDatabaseConfigured, assertProductionEnv } = await import("@/lib/env-check");
    assertProductionDatabaseConfigured("next-app");
    assertProductionEnv("next-app");
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
