/**
 * P1-ROBUST-1: Shared Zod schemas for common query parameter patterns.
 *
 * These schemas validate and coerce URL search params into typed values.
 * Used by GET routes that accept pagination, filtering, and search params.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Pagination                                                         */
/* ------------------------------------------------------------------ */

/** Coerces string search params to safe integers with defaults and bounds. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/* ------------------------------------------------------------------ */
/*  Search                                                             */
/* ------------------------------------------------------------------ */

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  query: z.string().trim().min(1).max(200).optional(),
  type: z.enum(["post", "project", "creator"]).optional(),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

/* ------------------------------------------------------------------ */
/*  Project listing                                                    */
/* ------------------------------------------------------------------ */

export const projectStatusSchema = z.enum(["idea", "building", "launched", "paused"]);

export const projectListQuerySchema = paginationSchema.extend({
  query: z.string().trim().max(200).optional(),
  tag: z.string().trim().max(100).optional(),
  tech: z.string().trim().max(100).optional(),
  team: z.string().trim().max(100).optional(),
  status: projectStatusSchema.optional(),
  cursor: z.string().trim().max(200).optional(),
});

export type ProjectListQueryInput = z.infer<typeof projectListQuerySchema>;

/* ------------------------------------------------------------------ */
/*  Leaderboard                                                        */
/* ------------------------------------------------------------------ */

export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "week must be YYYY-MM-DD").optional(),
});

export type LeaderboardQueryInput = z.infer<typeof leaderboardQuerySchema>;

/* ------------------------------------------------------------------ */
/*  Admin moderation                                                   */
/* ------------------------------------------------------------------ */

export const moderationStatusSchema = z.enum(["pending", "approved", "rejected", "all"]);

export const moderationQuerySchema = paginationSchema.extend({
  status: moderationStatusSchema.default("all"),
  query: z.string().trim().max(200).optional(),
  projectId: z.string().trim().max(200).optional(),
});

export type ModerationQueryInput = z.infer<typeof moderationQuerySchema>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Parse URLSearchParams into a plain object suitable for Zod .safeParse().
 * Converts entries to { key: value } and handles missing keys as undefined.
 */
export function searchParamsToRecord(params: URLSearchParams): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    record[key] = value;
  }
  return record;
}

/**
 * Validate search params against a Zod schema.
 * Returns { success: true, data } or { success: false, errors }.
 */
export function validateSearchParams<T extends z.ZodTypeAny>(
  params: URLSearchParams,
  schema: T,
): { success: true; data: z.infer<T> } | { success: false; errors: z.typeToFlattenedError<z.infer<T>> } {
  const result = schema.safeParse(searchParamsToRecord(params));
  if (!result.success) {
    return { success: false, errors: result.error.flatten() };
  }
  return { success: true, data: result.data };
}
