-- CreateEnum
CREATE TYPE "LedgerActorType" AS ENUM ('user', 'agent');

-- CreateEnum
CREATE TYPE "LedgerAnchorChain" AS ENUM ('vibehub', 'zhixin', 'baoquan');

-- AlterTable
ALTER TABLE "Workspace"
ADD COLUMN "ledgerEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "AgentActionAudit"
ADD COLUMN "ledgerEntryId" TEXT;

-- AlterTable
ALTER TABLE "AgentConfirmationRequest"
ADD COLUMN "ledgerEntryId" TEXT;

-- AlterTable
ALTER TABLE "SnapshotCapsule"
ADD COLUMN "ledgerEntryId" TEXT;

-- AlterTable
ALTER TABLE "WorkspaceDeliverable"
ADD COLUMN "ledgerEntryId" TEXT;

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorType" "LedgerActorType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actionKind" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "prevHash" TEXT,
    "signature" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anchorChain" "LedgerAnchorChain" NOT NULL DEFAULT 'vibehub',
    "anchorTxId" TEXT,
    "anchorVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentActionAudit_ledgerEntryId_key" ON "AgentActionAudit"("ledgerEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentConfirmationRequest_ledgerEntryId_key" ON "AgentConfirmationRequest"("ledgerEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "SnapshotCapsule_ledgerEntryId_key" ON "SnapshotCapsule"("ledgerEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceDeliverable_ledgerEntryId_key" ON "WorkspaceDeliverable"("ledgerEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_signature_key" ON "LedgerEntry"("signature");

-- CreateIndex
CREATE INDEX "LedgerEntry_workspaceId_signedAt_idx" ON "LedgerEntry"("workspaceId", "signedAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_actorType_actorId_signedAt_idx" ON "LedgerEntry"("actorType", "actorId", "signedAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_targetType_targetId_signedAt_idx" ON "LedgerEntry"("targetType", "targetId", "signedAt");

-- AddForeignKey
ALTER TABLE "AgentActionAudit"
ADD CONSTRAINT "AgentActionAudit_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConfirmationRequest"
ADD CONSTRAINT "AgentConfirmationRequest_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotCapsule"
ADD CONSTRAINT "SnapshotCapsule_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceDeliverable"
ADD CONSTRAINT "WorkspaceDeliverable_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry"
ADD CONSTRAINT "LedgerEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
