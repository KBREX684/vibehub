import { describe, expect, it } from "vitest";
import { checkQuota } from "../src/lib/quota";

describe("checkQuota (P2-4)", () => {
  it("allows first team for free tier", () => {
    const r = checkQuota("free", "teams", 0);
    expect(r.allowed).toBe(true);
    expect(r.limit).toBe(1);
  });
  it("blocks second team for free tier", () => {
    const r = checkQuota("free", "teams", 1);
    expect(r.allowed).toBe(false);
    expect(r.limit).toBe(1);
  });
  it("allows fifth team for pro tier", () => {
    expect(checkQuota("pro", "teams", 4).allowed).toBe(true);
  });
  it("blocks sixth team for pro tier", () => {
    const r = checkQuota("pro", "teams", 5);
    expect(r.allowed).toBe(false);
    expect(r.limit).toBe(5);
  });
  it("project limits for free", () => {
    expect(checkQuota("free", "projects", 2).allowed).toBe(true);
    expect(checkQuota("free", "projects", 3).allowed).toBe(false);
  });
});
