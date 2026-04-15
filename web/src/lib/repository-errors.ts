import { Prisma } from "@prisma/client";
import { apiError } from "@/lib/response";

export type RepositoryErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CREATOR_PROFILE_REQUIRED"
  | "INVALID_INPUT"
  | "INTERNAL";

export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(code: RepositoryErrorCode, message: string, httpStatus: number, details?: unknown) {
    super(message);
    this.name = "RepositoryError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export function mapPrismaToRepositoryError(err: unknown): RepositoryError | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }
  if (err.code === "P2002") {
    return new RepositoryError("CONFLICT", "Unique constraint violation", 409, err.meta);
  }
  if (err.code === "P2003") {
    return new RepositoryError("CONFLICT", "Referenced record does not exist or is still in use", 409);
  }
  if (err.code === "P2014") {
    return new RepositoryError("CONFLICT", "Operation violates a required relation", 409);
  }
  if (err.code === "P2016") {
    return new RepositoryError("INVALID_INPUT", "The provided input is invalid", 400);
  }
  if (err.code === "P2025") {
    return new RepositoryError("NOT_FOUND", "Record not found", 404, err.meta);
  }
  return new RepositoryError("INTERNAL", "A database operation failed", 500);
}

export function isRepositoryError(e: unknown): e is RepositoryError {
  return e instanceof RepositoryError;
}

/** For route catch blocks: map `RepositoryError` to JSON response, else return null. */
export function apiErrorFromRepositoryCatch(e: unknown) {
  const prismaMapped = mapPrismaToRepositoryError(e);
  if (prismaMapped) {
    return apiError(
      {
        code: prismaMapped.code,
        message: prismaMapped.message,
        details: prismaMapped.httpStatus >= 500 ? undefined : prismaMapped.details,
      },
      prismaMapped.httpStatus
    );
  }
  if (isRepositoryError(e)) {
    return apiError(
      {
        code: e.code,
        message: e.message,
        details: e.httpStatus >= 500 ? undefined : e.details,
      },
      e.httpStatus
    );
  }
  return null;
}
