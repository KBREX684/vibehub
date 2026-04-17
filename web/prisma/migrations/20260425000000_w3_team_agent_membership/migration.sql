-- v8 W3: Agent collaboration bus — TeamAgentMembership + TeamAgentRole enum
--
-- Pins an AgentBinding into a specific Team with a role card. The owner of
-- the binding must already be a member of the team (enforced in repository
-- layer, not in SQL). Team owner/admin grants / revokes / modifies the role.
--
-- Five role cards (values match docs/roadmap-v8.md §W3):
--   reader      — read-only (default)
--   commenter   — read + inline comments
--   executor    — read + claim tasks + mark done (writes via Confirmation)
--   reviewer    — read + submit advisory review opinions
--   coordinator — read + create + assign tasks (owner/admin-granted only)

-- CreateEnum
CREATE TYPE "TeamAgentRole" AS ENUM ('reader', 'commenter', 'executor', 'reviewer', 'coordinator');

-- CreateTable
CREATE TABLE "TeamAgentMembership" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "agentBindingId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "role" "TeamAgentRole" NOT NULL DEFAULT 'reader',
    "grantedByUserId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamAgentMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamAgentMembership_teamId_agentBindingId_key" ON "TeamAgentMembership"("teamId", "agentBindingId");

-- CreateIndex
CREATE INDEX "TeamAgentMembership_teamId_active_idx" ON "TeamAgentMembership"("teamId", "active");

-- CreateIndex
CREATE INDEX "TeamAgentMembership_agentBindingId_idx" ON "TeamAgentMembership"("agentBindingId");

-- CreateIndex
CREATE INDEX "TeamAgentMembership_ownerUserId_idx" ON "TeamAgentMembership"("ownerUserId");

-- AddForeignKey
ALTER TABLE "TeamAgentMembership" ADD CONSTRAINT "TeamAgentMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAgentMembership" ADD CONSTRAINT "TeamAgentMembership_agentBindingId_fkey" FOREIGN KEY ("agentBindingId") REFERENCES "AgentBinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAgentMembership" ADD CONSTRAINT "TeamAgentMembership_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAgentMembership" ADD CONSTRAINT "TeamAgentMembership_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
