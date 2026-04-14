import { describe, expect, it } from "vitest";
import {
  getProjectBySlug,
  listTeamsForUser,
  reviewEnterpriseVerification,
  submitEnterpriseVerification,
} from "../src/lib/repository";
import { hasEnterpriseWorkspaceAccess } from "../src/lib/enterprise-access";
import { mockUsers } from "../src/lib/data/mock-data";

describe("repository regression: enterprise/team/project split safety", () => {
  it("enterprise approval does not mutate admin role semantics", async () => {
    await submitEnterpriseVerification({
      userId: "u2",
      organizationName: "Observer Org",
      organizationWebsite: "https://observer.example",
      workEmail: "observer@example.com",
      useCase: "Secondary radar access",
    });

    const approved = await reviewEnterpriseVerification({
      userId: "u2",
      adminUserId: "u1",
      action: "approve",
      reviewNote: "approved for observer workspace",
    });
    expect(approved.status).toBe("approved");

    const user = mockUsers.find((candidate) => candidate.id === "u2");
    expect(user).not.toBeNull();
    expect(user?.role).toBe("user");
    expect(hasEnterpriseWorkspaceAccess(approved.status)).toBe(true);
  });

  it("team and project core reads remain functional via repository facade", async () => {
    const teams = await listTeamsForUser("u1");
    expect(teams.length).toBeGreaterThan(0);
    expect(teams.some((team) => team.slug === "vibehub-core")).toBe(true);

    const project = await getProjectBySlug("vibehub");
    expect(project).not.toBeNull();
    expect(project?.slug).toBe("vibehub");
  });
});
