-- CreateTable
CREATE TABLE "SnapshotCapsule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "goal" TEXT,
    "roleNotes" TEXT,
    "projectIds" TEXT[],
    "previousSnapshotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SnapshotCapsule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SnapshotCapsule_workspaceId_createdAt_idx" ON "SnapshotCapsule"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "SnapshotCapsule_createdByUserId_createdAt_idx" ON "SnapshotCapsule"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SnapshotCapsule_previousSnapshotId_idx" ON "SnapshotCapsule"("previousSnapshotId");

-- AddForeignKey
ALTER TABLE "SnapshotCapsule" ADD CONSTRAINT "SnapshotCapsule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotCapsule" ADD CONSTRAINT "SnapshotCapsule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotCapsule" ADD CONSTRAINT "SnapshotCapsule_previousSnapshotId_fkey" FOREIGN KEY ("previousSnapshotId") REFERENCES "SnapshotCapsule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
