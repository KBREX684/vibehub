/**
 * P4-BE-2: print pg_stat_user_indexes (run against staging/prod with DATABASE_URL).
 * Usage: DATABASE_URL=... npx tsx scripts/pg-index-stats.ts
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw<
      Array<{ relname: string; indexrelname: string; idx_scan: bigint; idx_tup_read: bigint; idx_tup_fetch: bigint }>
    >`
      SELECT relname, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
      FROM pg_stat_user_indexes
      ORDER BY idx_scan ASC
      LIMIT 50
    `;
    console.table(rows);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
