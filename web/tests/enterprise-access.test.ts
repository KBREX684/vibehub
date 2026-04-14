import { describe, expect, it } from "vitest";
import { hasApprovedEnterpriseAccess } from "../src/lib/enterprise-access";

describe("hasApprovedEnterpriseAccess", () => {
  it("allows admin regardless of enterprise status", () => {
    expect(hasApprovedEnterpriseAccess({ role: "admin", enterpriseStatus: "none" })).toBe(true);
    expect(hasApprovedEnterpriseAccess({ role: "admin", enterpriseStatus: "pending" })).toBe(true);
  });

  it("requires approved status for regular users", () => {
    expect(hasApprovedEnterpriseAccess({ role: "user", enterpriseStatus: "approved" })).toBe(true);
    expect(hasApprovedEnterpriseAccess({ role: "user", enterpriseStatus: "none" })).toBe(false);
    expect(hasApprovedEnterpriseAccess({ role: "user", enterpriseStatus: "pending" })).toBe(false);
    expect(hasApprovedEnterpriseAccess({ role: "user", enterpriseStatus: "rejected" })).toBe(false);
  });

  it("treats missing enterprise status as none for users", () => {
    expect(hasApprovedEnterpriseAccess({ role: "user" })).toBe(false);
  });
});
