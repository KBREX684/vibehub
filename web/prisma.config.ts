import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration (replaces deprecated `package.json#prisma`).
 * `DATABASE_URL` may be unset in CI when only `prisma generate` runs.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
