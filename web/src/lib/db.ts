import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

declare global {
  var __vibehub_prisma__: PrismaClient | undefined;
}

/**
 * P4-1: single PrismaClient per Node process (avoids exhausting connections under Next.js dev HMR).
 * P3-INFRA-3: adds configurable query timeout and slow-query logging.
 *
 * Timeout hierarchy:
 *   1. `PRISMA_QUERY_TIMEOUT_MS` env var → application-level per-query timeout (default 10 000 ms)
 *   2. Postgres-level: set `connect_timeout`, `pool_timeout`, `statement_timeout` via DATABASE_URL params
 */
const prismaLogLevel =
  process.env.PRISMA_LOG_QUERIES === "true"
    ? (["query", "error", "warn"] as const)
    : process.env.NODE_ENV === "development"
      ? (["error", "warn"] as const)
      : (["error"] as const);

const slowMsRaw = process.env.PRISMA_SLOW_QUERY_MS?.trim();
const slowQueryMs = slowMsRaw ? Number.parseInt(slowMsRaw, 10) : 0;

const timeoutMsRaw = process.env.PRISMA_QUERY_TIMEOUT_MS?.trim();
const queryTimeoutMs = timeoutMsRaw
  ? Number.parseInt(timeoutMsRaw, 10)
  : 10_000; // default 10 s

function prismaWithExtensions(base: PrismaClient): PrismaClient {
  const needsSlowLog =
    Number.isFinite(slowQueryMs) && slowQueryMs > 0;
  const needsTimeout =
    Number.isFinite(queryTimeoutMs) && queryTimeoutMs > 0;

  if (!needsSlowLog && !needsTimeout) return base;

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          const start = Date.now();

          if (!needsTimeout) {
            const result = await query(args);
            logSlowQuery(model, operation, start);
            return result;
          }

          // Application-level query timeout via Promise.race
          const queryPromise = query(args);
          const timeoutPromise = new Promise<never>((_, reject) => {
            const id = setTimeout(() => {
              clearTimeout(id);
              reject(
                new Error(
                  `Prisma query timeout: ${model}.${operation} exceeded ${queryTimeoutMs}ms`
                )
              );
            }, queryTimeoutMs);
            // Ensure the timer doesn't prevent Node from exiting
            if (typeof id === "object" && "unref" in id) id.unref();
          });

          const result = await Promise.race([queryPromise, timeoutPromise]);
          logSlowQuery(model, operation, start);
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}

function logSlowQuery(
  model: string | undefined,
  operation: string,
  start: number
) {
  if (!Number.isFinite(slowQueryMs) || slowQueryMs <= 0) return;
  const duration = Date.now() - start;
  if (duration >= slowQueryMs) {
    logger.warn({ model, operation, durationMs: duration }, "slow prisma query");
  }
}

export const prisma =
  global.__vibehub_prisma__ ??
  prismaWithExtensions(
    new PrismaClient({
      log: [...prismaLogLevel],
    })
  );

if (process.env.NODE_ENV !== "production") {
  global.__vibehub_prisma__ = prisma;
}
