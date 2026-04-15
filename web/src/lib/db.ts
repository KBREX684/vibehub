import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

declare global {
  var __vibehub_prisma__: PrismaClient | undefined;
}

/**
 * P4-1: single PrismaClient per Node process (avoids exhausting connections under Next.js dev HMR).
 * For serverless / pooled Postgres, set pool sizing on `DATABASE_URL` (e.g. `connection_limit`, `pool_timeout`).
 */
const prismaLogLevel =
  process.env.PRISMA_LOG_QUERIES === "true"
    ? (["query", "error", "warn"] as const)
    : process.env.NODE_ENV === "development"
      ? (["error", "warn"] as const)
      : (["error"] as const);

const slowMsRaw = process.env.PRISMA_SLOW_QUERY_MS?.trim();
const slowQueryMs = slowMsRaw ? Number.parseInt(slowMsRaw, 10) : 0;

function prismaWithSlowQueryLog(base: PrismaClient): PrismaClient {
  if (!Number.isFinite(slowQueryMs) || slowQueryMs <= 0) return base;
  return base.$extends({
    query: {
      $allModels: {
        $allOperations({ operation, model, args, query }) {
          const start = Date.now();
          return query(args).then((result: unknown) => {
            const duration = Date.now() - start;
            if (duration >= slowQueryMs) {
              logger.warn({ model, operation, durationMs: duration }, "slow prisma query");
            }
            return result;
          });
        },
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma =
  global.__vibehub_prisma__ ??
  prismaWithSlowQueryLog(
    new PrismaClient({
      log: [...prismaLogLevel],
    })
  );

if (process.env.NODE_ENV !== "production") {
  global.__vibehub_prisma__ = prisma;
}
