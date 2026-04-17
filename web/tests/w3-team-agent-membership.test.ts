import { afterEach, describe, expect, it } from "vitest";
import {
  addTeamAgentMembership,
  createAgentBindingForUser,
  listTeamAgentMemberships,
  listTeamAgentMembershipsForBinding,
  removeTeamAgentMembership,
  resolveTeamAgentRole,
  teamAgentCanComment,
  teamAgentCanCoordinate,
  teamAgentCanWriteTasks,
  updateTeamAgentMembership,
} from "../src/lib/repository";
import { mockTeamAgentMemberships } from "../src/lib/data/mock-team-agent-memberships";
import { mockAgentBindings } from "../src/lib/data/mock-agent-bindings";

const TEAM_SLUG = "vibehub-core";
const OWNER_ID = "u1"; // TeamRole = owner
const MEMBER_ID = "u2"; // TeamRole = member
const NON_MEMBER_ID = "u3"; // not in team1

/** Isolate the mock stores between tests so assertions on counts are stable. */
afterEach(() => {
  mockTeamAgentMemberships.length = 0;
  mockAgentBindings.length = 0;
});

async function seedBinding(userId: string, label: string) {
  return createAgentBindingForUser({
    userId,
    label,
    agentType: "cursor",
    description: undefined,
  });
}

describe("v8 W3 — TeamAgentMembership", () => {
  describe("capability helpers", () => {
    it("maps role → capability correctly", () => {
      expect(teamAgentCanComment("reader")).toBe(false);
      expect(teamAgentCanComment("commenter")).toBe(true);
      expect(teamAgentCanComment("coordinator")).toBe(true);

      expect(teamAgentCanWriteTasks("reader")).toBe(false);
      expect(teamAgentCanWriteTasks("reviewer")).toBe(false);
      expect(teamAgentCanWriteTasks("executor")).toBe(true);
      expect(teamAgentCanWriteTasks("coordinator")).toBe(true);

      expect(teamAgentCanCoordinate("executor")).toBe(false);
      expect(teamAgentCanCoordinate("reviewer")).toBe(false);
      expect(teamAgentCanCoordinate("coordinator")).toBe(true);
    });
  });

  describe("add / list / resolve", () => {
    it("owner can add their own agent with default reader role", async () => {
      const binding = await seedBinding(OWNER_ID, "Alice Cursor");
      const membership = await addTeamAgentMembership({
        teamSlug: TEAM_SLUG,
        actorUserId: OWNER_ID,
        agentBindingId: binding.id,
      });
      expect(membership.role).toBe("reader");
      expect(membership.ownerUserId).toBe(OWNER_ID);
      expect(membership.active).toBe(true);

      const list = await listTeamAgentMemberships({
        teamSlug: TEAM_SLUG,
        viewerUserId: MEMBER_ID,
      });
      expect(list).toHaveLength(1);
      expect(list[0].agentBindingId).toBe(binding.id);

      const resolved = await resolveTeamAgentRole({
        teamId: membership.teamId,
        agentBindingId: binding.id,
      });
      expect(resolved).toBe("reader");
    });

    it("owner can add a member's agent (owner promotes member's binding)", async () => {
      const binding = await seedBinding(MEMBER_ID, "Bob Claude");
      const membership = await addTeamAgentMembership({
        teamSlug: TEAM_SLUG,
        actorUserId: OWNER_ID,
        agentBindingId: binding.id,
        role: "executor",
      });
      expect(membership.ownerUserId).toBe(MEMBER_ID);
      expect(membership.grantedByUserId).toBe(OWNER_ID);
      expect(membership.role).toBe("executor");
    });

    it("non-owner/admin cannot add agents", async () => {
      const binding = await seedBinding(MEMBER_ID, "Bob self-serve");
      await expect(
        addTeamAgentMembership({
          teamSlug: TEAM_SLUG,
          actorUserId: MEMBER_ID,
          agentBindingId: binding.id,
        })
      ).rejects.toThrow("FORBIDDEN_TEAM_AGENT_MANAGE");
    });

    it("non-team-members cannot add agents", async () => {
      const binding = await seedBinding(NON_MEMBER_ID, "Outsider");
      await expect(
        addTeamAgentMembership({
          teamSlug: TEAM_SLUG,
          actorUserId: NON_MEMBER_ID,
          agentBindingId: binding.id,
        })
      ).rejects.toThrow("FORBIDDEN_NOT_TEAM_MEMBER");
    });

    it("cannot add an agent whose owner is not a team member", async () => {
      const binding = await seedBinding(NON_MEMBER_ID, "Outsider");
      await expect(
        addTeamAgentMembership({
          teamSlug: TEAM_SLUG,
          actorUserId: OWNER_ID,
          agentBindingId: binding.id,
        })
      ).rejects.toThrow("AGENT_OWNER_NOT_TEAM_MEMBER");
    });

    it("cannot add same binding twice", async () => {
      const binding = await seedBinding(OWNER_ID, "Alice dupe");
      await addTeamAgentMembership({
        teamSlug: TEAM_SLUG,
        actorUserId: OWNER_ID,
        agentBindingId: binding.id,
      });
      await expect(
        addTeamAgentMembership({
          teamSlug: TEAM_SLUG,
          actorUserId: OWNER_ID,
          agentBindingId: binding.id,
        })
      ).rejects.toThrow("TEAM_AGENT_ALREADY_MEMBER");
    });

    it("rejects unknown role", async () => {
      const binding = await seedBinding(OWNER_ID, "Alice bad-role");
      await expect(
        addTeamAgentMembership({
          teamSlug: TEAM_SLUG,
          actorUserId: OWNER_ID,
          agentBindingId: binding.id,
          // @ts-expect-error — deliberately bad value for the assertion.
          role: "superuser",
        })
      ).rejects.toThrow("INVALID_TEAM_AGENT_ROLE");
    });
  });

  describe("update lifecycle", () => {
    it("owner can change role and pause a membership", async () => {
      const binding = await seedBinding(OWNER_ID, "Alice lifecycle");
      const membership = await addTeamAgentMembership({
        teamSlug: TEAM_SLUG,
        actorUserId: OWNER_ID,
        agentBindingId: binding.id,
      });

      const updated = await updateTeamAgentMembership({
        teamSlug: TEAM_SLUG,
        actorUserId: OWNER_ID,
        membershipId: membership.id,
        role: "executor",
        active: false,
      });
      expect(updated.role).toBe("executor");
      expect(updated.active).toBe(false);

      // Resolve should return null for paused memberships.
      const resolved = await resolveTeamAgentRole({
        teamId: membership.teamId,
        agentBindingId: binding.id,
      });
      expect(resolved).toBeNull();
    });

    it("non-owner cannot update", async () => {
      const binding = await seedBinding(MEMBER_ID, "Bob exec");
      const membership = await addTeamAgentMembership({
        teamSlug: TEAM_SLUG,
        actorUserId: OWNER_ID,
        agentBindingId: binding.id,
      });
      await expect(
        updateTeamAgentMembership({
          teamSlug: TEAM_SLUG,
          actorUserId: MEMBER_ID,
          membershipId: membership.id,
          role: "executor",
        })
      ).rejects.toThrow("FORBIDDEN_TEAM_AGENT_MANAGE");
    });

    it("remove cleans up the membership", async () => {
      const binding = await seedBinding(OWNER_ID, "Alice temp");
      const membership = await addTeamAgentMembership({
        teamSlug: TEAM_SLUG,
        actorUserId: OWNER_ID,
        agentBindingId: binding.id,
      });
      await removeTeamAgentMembership({
        teamSlug: TEAM_SLUG,
        actorUserId: OWNER_ID,
        membershipId: membership.id,
      });
      const list = await listTeamAgentMemberships({
        teamSlug: TEAM_SLUG,
        viewerUserId: OWNER_ID,
      });
      expect(list.find((m) => m.id === membership.id)).toBeUndefined();
    });
  });

  describe("binding → teams cross-listing", () => {
    it("lists teams a binding belongs to", async () => {
      const binding = await seedBinding(OWNER_ID, "Alice cross");
      await addTeamAgentMembership({
        teamSlug: TEAM_SLUG,
        actorUserId: OWNER_ID,
        agentBindingId: binding.id,
        role: "reader",
      });
      const rows = await listTeamAgentMembershipsForBinding({
        userId: OWNER_ID,
        agentBindingId: binding.id,
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].teamSlug).toBe(TEAM_SLUG);
      expect(rows[0].role).toBe("reader");
    });

    it("refuses to list teams for someone else's binding", async () => {
      const binding = await seedBinding(OWNER_ID, "Alice private");
      await expect(
        listTeamAgentMembershipsForBinding({
          userId: MEMBER_ID,
          agentBindingId: binding.id,
        })
      ).rejects.toThrow("AGENT_BINDING_NOT_FOUND");
    });
  });

  describe("resolve guard", () => {
    it("returns null for agent not in team", async () => {
      const binding = await seedBinding(OWNER_ID, "Alice absent");
      // Not added to any team.
      const resolved = await resolveTeamAgentRole({
        teamId: "team1",
        agentBindingId: binding.id,
      });
      expect(resolved).toBeNull();
    });
  });
});
