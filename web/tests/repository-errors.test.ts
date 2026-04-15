import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  apiErrorFromRepositoryCatch,
  mapPrismaToRepositoryError,
  RepositoryError,
} from "../src/lib/repository-errors";

function makePrismaKnownError(code: string, meta?: Record<string, unknown>) {
  return Object.assign(Object.create(Prisma.PrismaClientKnownRequestError.prototype), {
    code,
    meta,
  }) as Prisma.PrismaClientKnownRequestError;
}

describe("repository error mapping", () => {
  it("maps P2002 to a conflict", () => {
    const mapped = mapPrismaToRepositoryError(
      makePrismaKnownError("P2002", { target: ["slug"] })
    );
    expect(mapped).toBeInstanceOf(RepositoryError);
    expect(mapped?.code).toBe("CONFLICT");
    expect(mapped?.httpStatus).toBe(409);
  });

  it("maps P2025 to not found", () => {
    const mapped = mapPrismaToRepositoryError(makePrismaKnownError("P2025"));
    expect(mapped?.code).toBe("NOT_FOUND");
    expect(mapped?.httpStatus).toBe(404);
  });

  it("maps unknown Prisma known errors to a generic internal error", async () => {
    const response = apiErrorFromRepositoryCatch(makePrismaKnownError("P2037"));
    expect(response).not.toBeNull();
    expect(response?.status).toBe(500);
    expect(await response?.json()).toMatchObject({
      error: {
        code: "INTERNAL",
        message: "A database operation failed",
      },
    });
  });
});
