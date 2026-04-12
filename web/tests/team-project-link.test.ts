import { describe, expect, it } from "vitest";
import { createTeam, getProjectBySlug, getTeamBySlug, updateProjectTeamLink } from "../src/lib/repository";

describe("project team link (P3-3, mock)", () => {
  it("exposes team on project and team detail lists project", async () => {
    const p = await getProjectBySlug("vibehub");
    expect(p?.team?.slug).toBe("vibehub-core");
    const team = await getTeamBySlug("vibehub-core");
    expect(team?.teamProjects?.some((x) => x.slug === "vibehub")).toBe(true);
  });

  it("creator can unlink and relink team", async () => {
    await updateProjectTeamLink({ projectSlug: "vibehub", actorUserId: "u1", teamSlug: null });
    let p = await getProjectBySlug("vibehub");
    expect(p?.team).toBeUndefined();

    await updateProjectTeamLink({ projectSlug: "vibehub", actorUserId: "u1", teamSlug: "vibehub-core" });
    p = await getProjectBySlug("vibehub");
    expect(p?.team?.slug).toBe("vibehub-core");
  });

  it("non-member cannot link team", async () => {
    const solo = await createTeam({ ownerUserId: "u1", name: "Owner Only Squad" });
    await expect(
      updateProjectTeamLink({ projectSlug: "prompt-lab", actorUserId: "u2", teamSlug: solo.slug })
    ).rejects.toThrow("FORBIDDEN_NOT_TEAM_MEMBER");
  });
});
