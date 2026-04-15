import { PrismaClient } from "@prisma/client";

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

export const prisma =
  global.__vibehub_prisma__ ??
  new PrismaClient({
    log: [...prismaLogLevel],
  });

if (process.env.NODE_ENV !== "production") {
  global.__vibehub_prisma__ = prisma;
}
