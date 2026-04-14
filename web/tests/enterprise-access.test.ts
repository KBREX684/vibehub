import { describe, expect, it } from "vitest";
import { hasEnterpriseWorkspaceAccess } from "../src/lib/enterprise-access";

describe("hasEnterpriseWorkspaceAccess", () => {
  it("requires approved enterprise status even for platform admins", () => {
    expect(hasEnterpriseWorkspaceAccess("none")).toBe(false);
    expect(hasEnterpriseWorkspaceAccess("pending")).toBe(false);
    expect(hasEnterpriseWorkspaceAccess("rejected")).toBe(false);
  });

  it("allows approved enterprise status", () => {
    expect(hasEnterpriseWorkspaceAccess("approved")).toBe(true);
  });

  it("treats missing enterprise status as no access", () => {
    expect(hasEnterpriseWorkspaceAccess()).toBe(false);
  });
});
