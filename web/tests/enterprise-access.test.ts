import { describe, expect, it } from "vitest";
import { hasEnterpriseWorkspaceAccess } from "../src/lib/enterprise-access";
import { reviewEnterpriseVerification, submitEnterpriseVerification } from "../src/lib/repository";

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

  it("enterprise approval does not imply admin governance role", async () => {
    const profile = await submitEnterpriseVerification({
      userId: "u2",
      organizationName: "Acme Labs",
      organizationWebsite: "https://acme.example",
      workEmail: "member@acme.example",
      useCase: "observer radar",
    });
    expect(profile.status).toBe("pending");

    const approved = await reviewEnterpriseVerification({
      userId: "u2",
      adminUserId: "u1",
      action: "approve",
      reviewNote: "ok",
    });
    expect(approved.status).toBe("approved");
    expect(hasEnterpriseWorkspaceAccess(approved.status)).toBe(true);
  });
});
