import type { TeamAgentRole } from "@/lib/types";

/**
 * Mock-mode store for `TeamAgentMembership` (see prisma/schema.prisma §W3).
 *
 * Kept separate from `mock-data.ts` so it stays append-only across PRs and
 * so the mock shape can evolve independently of the public DTO type. The
 * repository layer is responsible for projecting `MockTeamAgentMembership`
 * into `TeamAgentMembershipSummary` for the API.
 */
export interface MockTeamAgentMembership {
  id: string;
  teamId: string;
  agentBindingId: string;
  ownerUserId: string;
  role: TeamAgentRole;
  grantedByUserId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const mockTeamAgentMemberships: MockTeamAgentMembership[] = [];
