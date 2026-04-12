import { describe, expect, it } from "vitest";
import {
  addTeamMemberByEmail,
  createTeam,
  getTeamBySlug,
  listTeams,
  removeTeamMember,
  requestTeamJoin,
  reviewTeamJoinRequest,
} from "../src/lib/repository";

describe("teams repository (P3-1 + P3-2, mock)", () => {
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

  it("requestTeamJoin creates pending request; duplicate pending rejected", async () => {
    const created = await createTeam({ ownerUserId: "u1", name: "Request Team" });
    await requestTeamJoin({ teamSlug: created.slug, userId: "u2", message: "Hi" });
    const forViewer = await getTeamBySlug(created.slug, "u2");
    expect(forViewer?.viewerPendingJoinRequest).toBe(true);
    await expect(requestTeamJoin({ teamSlug: created.slug, userId: "u2" })).rejects.toThrow(
      "TEAM_JOIN_REQUEST_PENDING"
    );
  });

  it("owner approves join request then applicant is member", async () => {
    const created = await createTeam({ ownerUserId: "u1", name: "Approve Team" });
    const req = await requestTeamJoin({ teamSlug: created.slug, userId: "u3" });
    await reviewTeamJoinRequest({
      teamSlug: created.slug,
      requestId: req.id,
      ownerUserId: "u1",
      action: "approve",
    });
    const t = await getTeamBySlug(created.slug);
    expect(t!.members.some((m) => m.userId === "u3")).toBe(true);
  });

  it("owner rejects join request", async () => {
    const created = await createTeam({ ownerUserId: "u1", name: "Reject Team" });
    const req = await requestTeamJoin({ teamSlug: created.slug, userId: "u2" });
    await reviewTeamJoinRequest({
      teamSlug: created.slug,
      requestId: req.id,
      ownerUserId: "u1",
      action: "reject",
    });
    const t = await getTeamBySlug(created.slug);
    expect(t!.members.some((m) => m.userId === "u2")).toBe(false);
  });

  it("can re-apply after reject by reopening the same request row", async () => {
    const created = await createTeam({ ownerUserId: "u1", name: "Reapply Team" });
    const req1 = await requestTeamJoin({ teamSlug: created.slug, userId: "u2" });
    await reviewTeamJoinRequest({
      teamSlug: created.slug,
      requestId: req1.id,
      ownerUserId: "u1",
      action: "reject",
    });
    const req2 = await requestTeamJoin({ teamSlug: created.slug, userId: "u2", message: "Again" });
    expect(req2.id).toBe(req1.id);
    expect(req2.status).toBe("pending");
  });

  it("owner cannot request to join own team", async () => {
    const created = await createTeam({ ownerUserId: "u1", name: "Owner Team" });
    await expect(requestTeamJoin({ teamSlug: created.slug, userId: "u1" })).rejects.toThrow(
      "TEAM_OWNER_NO_REQUEST"
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
    const req = await requestTeamJoin({ teamSlug: created.slug, userId: "u2" });
    await reviewTeamJoinRequest({
      teamSlug: created.slug,
      requestId: req.id,
      ownerUserId: "u1",
      action: "approve",
    });
    await removeTeamMember({ teamSlug: created.slug, actorUserId: "u2", memberUserId: "u2" });
    const t = await getTeamBySlug(created.slug);
    expect(t!.members.some((m) => m.userId === "u2")).toBe(false);

    await expect(
      removeTeamMember({ teamSlug: created.slug, actorUserId: "u1", memberUserId: "u1" })
    ).rejects.toThrow("CANNOT_REMOVE_OWNER");
  });

  it("keeps slug <= 48 chars when resolving duplicates", async () => {
    const baseSlug = "z".repeat(48);

    const first = await createTeam({
      ownerUserId: "u1",
      name: "Long Slug Team 1",
      slug: baseSlug,
    });
    const second = await createTeam({
      ownerUserId: "u1",
      name: "Long Slug Team 2",
      slug: baseSlug,
    });

    expect(first.slug.length).toBeLessThanOrEqual(48);
    expect(second.slug.length).toBeLessThanOrEqual(48);
    expect(second.slug).toBe(`${"z".repeat(46)}-1`);
  });
});
