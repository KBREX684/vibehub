import { describe, it, expect } from "vitest";
import {
  paginationSchema,
  searchQuerySchema,
  projectListQuerySchema,
  leaderboardQuerySchema,
  moderationQuerySchema,
  searchParamsToRecord,
  validateSearchParams,
} from "@/lib/schemas/query-params";

describe("paginationSchema", () => {
  it("uses defaults when params are empty", () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("coerces string values", () => {
    const result = paginationSchema.safeParse({ page: "3", limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it("rejects page < 1", () => {
    const result = paginationSchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects limit > 100", () => {
    const result = paginationSchema.safeParse({ limit: "200" });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer values", () => {
    const result = paginationSchema.safeParse({ page: "1.5" });
    expect(result.success).toBe(false);
  });
});

describe("searchQuerySchema", () => {
  it("accepts valid search params", () => {
    const result = searchQuerySchema.safeParse({ q: "react", type: "project" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = searchQuerySchema.safeParse({ type: "invalid" });
    expect(result.success).toBe(false);
  });

  it("allows all fields optional", () => {
    const result = searchQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("projectListQuerySchema", () => {
  it("accepts valid project list params", () => {
    const result = projectListQuerySchema.safeParse({
      page: "1",
      limit: "10",
      query: "my project",
      tag: "react",
      tech: "typescript",
      status: "building",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("building");
    }
  });

  it("rejects invalid status", () => {
    const result = projectListQuerySchema.safeParse({ status: "invalid" });
    expect(result.success).toBe(false);
  });

  it("trims and bounds query string", () => {
    const result = projectListQuerySchema.safeParse({ query: "  hello  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("hello");
    }
  });
});

describe("leaderboardQuerySchema", () => {
  it("defaults limit to 10", () => {
    const result = leaderboardQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it("validates week format", () => {
    const result = leaderboardQuerySchema.safeParse({ week: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("accepts valid week", () => {
    const result = leaderboardQuerySchema.safeParse({ week: "2026-04-13" });
    expect(result.success).toBe(true);
  });

  it("caps limit at 100", () => {
    const result = leaderboardQuerySchema.safeParse({ limit: "200" });
    expect(result.success).toBe(false);
  });
});

describe("moderationQuerySchema", () => {
  it("defaults status to all", () => {
    const result = moderationQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("all");
    }
  });

  it("accepts pending status", () => {
    const result = moderationQuerySchema.safeParse({ status: "pending" });
    expect(result.success).toBe(true);
  });

  it("rejects unknown status", () => {
    const result = moderationQuerySchema.safeParse({ status: "unknown" });
    expect(result.success).toBe(false);
  });
});

describe("searchParamsToRecord", () => {
  it("converts URLSearchParams to object", () => {
    const params = new URLSearchParams("page=2&limit=10&query=hello");
    const record = searchParamsToRecord(params);
    expect(record).toEqual({ page: "2", limit: "10", query: "hello" });
  });

  it("returns empty object for empty params", () => {
    const record = searchParamsToRecord(new URLSearchParams());
    expect(record).toEqual({});
  });
});

describe("validateSearchParams", () => {
  it("returns success for valid params", () => {
    const params = new URLSearchParams("page=2&limit=10");
    const result = validateSearchParams(params, paginationSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
    }
  });

  it("returns errors for invalid params", () => {
    const params = new URLSearchParams("page=0");
    const result = validateSearchParams(params, paginationSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.fieldErrors).toBeDefined();
    }
  });
});
