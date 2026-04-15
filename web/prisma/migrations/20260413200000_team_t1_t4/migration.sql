-- T-1: External chat links on Team
ALTER TABLE "Team" ADD COLUMN "discordUrl"    TEXT;
ALTER TABLE "Team" ADD COLUMN "telegramUrl"   TEXT;
ALTER TABLE "Team" ADD COLUMN "slackUrl"      TEXT;

-- T-3: GitHub org/repo URL on Team
ALTER TABLE "Team" ADD COLUMN "githubOrgUrl"  TEXT;
ALTER TABLE "Team" ADD COLUMN "githubRepoUrl" TEXT;

-- T-2: Milestone visibility + progress
ALTER TABLE "TeamMilestone" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'team_only';
ALTER TABLE "TeamMilestone" ADD COLUMN "progress"   INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "TeamMilestone_teamId_visibility_idx" ON "TeamMilestone"("teamId", "visibility");

-- T-4: convertedToTeamMembership tracking on CollaborationIntent
ALTER TABLE "CollaborationIntent" ADD COLUMN "convertedToTeamMembership" BOOLEAN NOT NULL DEFAULT false;
