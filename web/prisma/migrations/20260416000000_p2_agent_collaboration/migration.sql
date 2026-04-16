-- P2 agent collaboration: review workflow, agent audit, confirmation requests

ALTER TYPE "TeamTaskStatus" ADD VALUE IF NOT EXISTS 'review';
ALTER TYPE "TeamTaskStatus" ADD VALUE IF NOT EXISTS 'rejected';

ALTER TYPE "InAppNotificationKind" ADD VALUE IF NOT EXISTS 'team_task_ready_for_review';
ALTER TYPE "InAppNotificationKind" ADD VALUE IF NOT EXISTS 'team_task_reviewed';
ALTER TYPE "InAppNotificationKind" ADD VALUE IF NOT EXISTS 'agent_confirmation_required';

CREATE TYPE "AgentActionStatus" AS ENUM ('succeeded', 'confirmation_required', 'rejected');
CREATE TYPE "AgentConfirmationStatus" AS ENUM ('pending', 'approved', 'rejected', 'canceled');

ALTER TABLE "TeamTask"
  ADD COLUMN IF NOT EXISTS "reviewRequestedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;

ALTER TABLE "TeamTask"
  ADD CONSTRAINT "TeamTask_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "TeamTask_reviewedByUserId_idx" ON "TeamTask"("reviewedByUserId");

CREATE TABLE "AgentActionAudit" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "agentBindingId" TEXT NOT NULL,
  "apiKeyId" TEXT,
  "teamId" TEXT,
  "taskId" TEXT,
  "action" TEXT NOT NULL,
  "outcome" "AgentActionStatus" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentActionAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentActionAudit_actorUserId_createdAt_idx" ON "AgentActionAudit"("actorUserId", "createdAt");
CREATE INDEX "AgentActionAudit_agentBindingId_createdAt_idx" ON "AgentActionAudit"("agentBindingId", "createdAt");
CREATE INDEX "AgentActionAudit_teamId_createdAt_idx" ON "AgentActionAudit"("teamId", "createdAt");
CREATE INDEX "AgentActionAudit_taskId_createdAt_idx" ON "AgentActionAudit"("taskId", "createdAt");

ALTER TABLE "AgentActionAudit"
  ADD CONSTRAINT "AgentActionAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AgentActionAudit_agentBindingId_fkey" FOREIGN KEY ("agentBindingId") REFERENCES "AgentBinding"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AgentActionAudit_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "AgentActionAudit_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TeamTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AgentConfirmationRequest" (
  "id" TEXT NOT NULL,
  "requesterUserId" TEXT NOT NULL,
  "agentBindingId" TEXT NOT NULL,
  "apiKeyId" TEXT,
  "teamId" TEXT,
  "taskId" TEXT,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "payload" JSONB NOT NULL,
  "status" "AgentConfirmationStatus" NOT NULL DEFAULT 'pending',
  "decidedByUserId" TEXT,
  "decidedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentConfirmationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentConfirmationRequest_requesterUserId_status_createdAt_idx" ON "AgentConfirmationRequest"("requesterUserId", "status", "createdAt");
CREATE INDEX "AgentConfirmationRequest_agentBindingId_status_createdAt_idx" ON "AgentConfirmationRequest"("agentBindingId", "status", "createdAt");
CREATE INDEX "AgentConfirmationRequest_teamId_status_createdAt_idx" ON "AgentConfirmationRequest"("teamId", "status", "createdAt");
CREATE INDEX "AgentConfirmationRequest_taskId_status_createdAt_idx" ON "AgentConfirmationRequest"("taskId", "status", "createdAt");

ALTER TABLE "AgentConfirmationRequest"
  ADD CONSTRAINT "AgentConfirmationRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AgentConfirmationRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "AgentConfirmationRequest_agentBindingId_fkey" FOREIGN KEY ("agentBindingId") REFERENCES "AgentBinding"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AgentConfirmationRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "AgentConfirmationRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TeamTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
