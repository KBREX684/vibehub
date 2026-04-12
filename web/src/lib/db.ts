import { PrismaClient } from "@prisma/client";

declare global {
  var __vibehub_prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__vibehub_prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__vibehub_prisma__ = prisma;
}
