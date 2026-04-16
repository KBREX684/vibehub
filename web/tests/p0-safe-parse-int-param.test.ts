import { describe, it, expect } from "vitest";
import { safeParseIntParam } from "@/lib/safe-parse-int-param";

describe("safeParseIntParam", () => {
  it("returns fallback for null/undefined", () => {
    expect(safeParseIntParam(null, 50)).toBe(50);
    expect(safeParseIntParam(undefined, 100)).toBe(100);
  });

  it("parses valid integer strings", () => {
    expect(safeParseIntParam("10", 50)).toBe(10);
    expect(safeParseIntParam("200", 50, 1, 500)).toBe(200);
  });

  it("clamps to min", () => {
    expect(safeParseIntParam("0", 50, 1, 500)).toBe(1);
    expect(safeParseIntParam("-5", 50, 1, 500)).toBe(1);
  });

  it("clamps to max", () => {
    expect(safeParseIntParam("9999", 50, 1, 500)).toBe(500);
    expect(safeParseIntParam("201", 50, 1, 200)).toBe(200);
  });

  it("returns fallback for NaN inputs", () => {
    expect(safeParseIntParam("abc", 50)).toBe(50);
    expect(safeParseIntParam("", 50)).toBe(50);
    expect(safeParseIntParam("NaN", 50)).toBe(50);
  });

  it("returns fallback for Infinity", () => {
    expect(safeParseIntParam("Infinity", 50)).toBe(50);
    expect(safeParseIntParam("-Infinity", 50)).toBe(50);
  });

  it("uses default min=1 and max=500", () => {
    expect(safeParseIntParam("0", 50)).toBe(1);
    expect(safeParseIntParam("600", 50)).toBe(500);
  });
});
