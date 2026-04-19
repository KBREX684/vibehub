-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "AgentTaskStatus" AS ENUM ('running', 'pending_confirm', 'done', 'failed');

-- CreateTable
CREATE TABLE "WorkspaceDeliverable" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "DeliverableStatus" NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "agentBindingId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "workspaceId" TEXT,
    "teamId" TEXT,
    "confirmationRequestId" TEXT,
    "taskId" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "AgentTaskStatus" NOT NULL,
    "metadata" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceDeliverable_workspaceId_createdAt_idx" ON "WorkspaceDeliverable"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkspaceDeliverable_snapshotId_createdAt_idx" ON "WorkspaceDeliverable"("snapshotId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkspaceDeliverable_createdByUserId_createdAt_idx" ON "WorkspaceDeliverable"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkspaceDeliverable_status_createdAt_idx" ON "WorkspaceDeliverable"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentTask_confirmationRequestId_key" ON "AgentTask"("confirmationRequestId");

-- CreateIndex
CREATE INDEX "AgentTask_requesterUserId_createdAt_idx" ON "AgentTask"("requesterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentTask_agentBindingId_createdAt_idx" ON "AgentTask"("agentBindingId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentTask_workspaceId_createdAt_idx" ON "AgentTask"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentTask_teamId_createdAt_idx" ON "AgentTask"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentTask_taskId_createdAt_idx" ON "AgentTask"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentTask_status_createdAt_idx" ON "AgentTask"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkspaceDeliverable" ADD CONSTRAINT "WorkspaceDeliverable_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceDeliverable" ADD CONSTRAINT "WorkspaceDeliverable_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SnapshotCapsule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceDeliverable" ADD CONSTRAINT "WorkspaceDeliverable_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceDeliverable" ADD CONSTRAINT "WorkspaceDeliverable_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_agentBindingId_fkey" FOREIGN KEY ("agentBindingId") REFERENCES "AgentBinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TeamTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_confirmationRequestId_fkey" FOREIGN KEY ("confirmationRequestId") REFERENCES "AgentConfirmationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
