import { describe, expect, it } from "vitest";
import { checkQuota } from "../src/lib/quota";

/**
 * v11 重写：原 v10 配额维度（teams / projects / screenshots）已在 v11
 * 删除（RFC §0.1 / §5.1），现配额维度收口为 storage / ledger_monthly /
 * api_keys 三项，团队/项目维度永远允许。
 */
describe("checkQuota (v11)", () => {
  it("allows storage uploads under free quota", () => {
    const r = checkQuota("free", "storage", 0);
    expect(r.allowed).toBe(true);
    expect(r.limit).toBe(1);
  });

  it("blocks storage uploads at free quota", () => {
    const r = checkQuota("free", "storage", 1);
    expect(r.allowed).toBe(false);
    expect(r.limit).toBe(1);
  });

  it("allows pro storage up to its 10 GB cap", () => {
    expect(checkQuota("pro", "storage", 9).allowed).toBe(true);
    expect(checkQuota("pro", "storage", 10).allowed).toBe(false);
  });

  it("free ledger_monthly caps at 100", () => {
    expect(checkQuota("free", "ledger_monthly", 99).allowed).toBe(true);
    expect(checkQuota("free", "ledger_monthly", 100).allowed).toBe(false);
  });

  it("pro ledger_monthly is unlimited", () => {
    expect(checkQuota("pro", "ledger_monthly", 1_000_000).allowed).toBe(true);
  });

  it("api_keys cap differs by tier", () => {
    expect(checkQuota("free", "api_keys", 2).allowed).toBe(false);
    expect(checkQuota("pro", "api_keys", 9).allowed).toBe(true);
  });

  it("legacy v10 resources (teams/projects/screenshots) always allowed", () => {
    expect(checkQuota("free", "teams", 999).allowed).toBe(true);
    expect(checkQuota("free", "projects", 999).allowed).toBe(true);
    expect(checkQuota("free", "screenshots", 999).allowed).toBe(true);
  });
});
