import PgBoss from "pg-boss";
import { logger } from "@/lib/logger";

let bossInstance: PgBoss | null = null;
let bossStarting: Promise<PgBoss | null> | null = null;

export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL?.trim() || undefined;
}

/** Shared pg-boss instance for webhook + credit workers (P3-BE-1). */
export async function getSharedBoss(): Promise<PgBoss | null> {
  const url = databaseUrl();
  if (!url) return null;
  if (bossInstance) return bossInstance;
  if (!bossStarting) {
    bossStarting = (async () => {
      const b = new PgBoss(url);
      b.on("error", (err: unknown) => {
        logger.error({ err }, "pg-boss error");
      });
      await b.start();
      bossInstance = b;
      return b;
    })();
  }
  return bossStarting;
}
