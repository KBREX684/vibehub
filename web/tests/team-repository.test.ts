import { describe, expect, it } from "vitest";
import {
  addTeamMemberByEmail,
  createTeam,
  getTeamBySlug,
  joinTeamAsMember,
  listTeams,
  removeTeamMember,
} from "../src/lib/repository";

describe("teams repository (P3-1, mock)", () => {
  it("lists teams including seed team", async () => {
    const r = await listTeams({ page: 1, limit: 20 });
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.some((t) => t.slug === "vibehub-core")).toBe(true);
  });

  it("gets team detail with members", async () => {
    const t = await getTeamBySlug("vibehub-core");
    expect(t).not.toBeNull();
    expect(t!.members.some((m) => m.role === "owner")).toBe(true);
  });

  it("creates a team and owner membership", async () => {
    const created = await createTeam({
      ownerUserId: "u1",
      name: "Alpha Squad",
      mission: "Test mission",
    });
    expect(created.slug).toMatch(/^alpha-squad/);
    expect(created.members.find((m) => m.userId === "u1")?.role).toBe("owner");
  });

  it("joins as member and prevents duplicate", async () => {
    const created = await createTeam({ ownerUserId: "u1", name: "Join Test Team" });
    await joinTeamAsMember({ teamSlug: created.slug, userId: "u2" });
    await expect(joinTeamAsMember({ teamSlug: created.slug, userId: "u2" })).rejects.toThrow(
      "TEAM_ALREADY_MEMBER"
    );
  });

  it("owner adds member by email", async () => {
    const created = await createTeam({ ownerUserId: "u1", name: "Invite Team" });
    const m = await addTeamMemberByEmail({
      teamSlug: created.slug,
      actorUserId: "u1",
      email: "chen@vibehub.dev",
    });
    expect(m.userId).toBe("u3");
  });

  it("member can leave; owner cannot be removed", async () => {
    const created = await createTeam({ ownerUserId: "u1", name: "Leave Team" });
    await joinTeamAsMember({ teamSlug: created.slug, userId: "u2" });
    await removeTeamMember({ teamSlug: created.slug, actorUserId: "u2", memberUserId: "u2" });
    const t = await getTeamBySlug(created.slug);
    expect(t!.members.some((m) => m.userId === "u2")).toBe(false);

    await expect(
      removeTeamMember({ teamSlug: created.slug, actorUserId: "u1", memberUserId: "u1" })
    ).rejects.toThrow("CANNOT_REMOVE_OWNER");
  });
});
