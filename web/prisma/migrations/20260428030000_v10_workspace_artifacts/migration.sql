-- CreateEnum
CREATE TYPE "WorkspaceArtifactVisibility" AS ENUM ('workspace');

-- CreateEnum
CREATE TYPE "WorkspaceArtifactValidationState" AS ENUM ('pending', 'ready', 'rejected');

-- CreateTable
CREATE TABLE "WorkspaceArtifact" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "uploaderUserId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "visibility" "WorkspaceArtifactVisibility" NOT NULL DEFAULT 'workspace',
    "validationState" "WorkspaceArtifactValidationState" NOT NULL DEFAULT 'pending',
    "publicUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceArtifact_storageKey_key" ON "WorkspaceArtifact"("storageKey");

-- CreateIndex
CREATE INDEX "WorkspaceArtifact_workspaceId_createdAt_idx" ON "WorkspaceArtifact"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkspaceArtifact_uploaderUserId_createdAt_idx" ON "WorkspaceArtifact"("uploaderUserId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkspaceArtifact_workspaceId_validationState_idx" ON "WorkspaceArtifact"("workspaceId", "validationState");

-- AddForeignKey
ALTER TABLE "WorkspaceArtifact" ADD CONSTRAINT "WorkspaceArtifact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceArtifact" ADD CONSTRAINT "WorkspaceArtifact_uploaderUserId_fkey" FOREIGN KEY ("uploaderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
