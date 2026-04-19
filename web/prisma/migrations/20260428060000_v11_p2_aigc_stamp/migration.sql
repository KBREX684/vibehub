-- CreateEnum
CREATE TYPE "AigcStampMode" AS ENUM ('text', 'image', 'audio', 'video');

-- CreateEnum
CREATE TYPE "AigcProviderApi" AS ENUM ('local', 'tencent', 'aliyun');

-- AlterTable
ALTER TABLE "Workspace"
ADD COLUMN "aigcAutoStamp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "aigcProvider" "AigcProviderApi" NOT NULL DEFAULT 'local';

-- AlterTable
ALTER TABLE "WorkspaceArtifact"
ADD COLUMN "aigcStampId" TEXT,
ADD COLUMN "requireAigcStamp" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AigcStamp" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" "AigcProviderApi" NOT NULL,
    "mode" "AigcStampMode" NOT NULL,
    "visibleLabel" TEXT NOT NULL,
    "hiddenWatermarkId" TEXT,
    "rawResponse" JSONB,
    "stampedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AigcStamp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceArtifact_aigcStampId_key" ON "WorkspaceArtifact"("aigcStampId");

-- CreateIndex
CREATE UNIQUE INDEX "AigcStamp_artifactId_key" ON "AigcStamp"("artifactId");

-- CreateIndex
CREATE INDEX "AigcStamp_workspaceId_stampedAt_idx" ON "AigcStamp"("workspaceId", "stampedAt");

-- CreateIndex
CREATE INDEX "AigcStamp_provider_stampedAt_idx" ON "AigcStamp"("provider", "stampedAt");

-- CreateIndex
CREATE INDEX "AigcStamp_mode_stampedAt_idx" ON "AigcStamp"("mode", "stampedAt");

-- AddForeignKey
ALTER TABLE "AigcStamp"
ADD CONSTRAINT "AigcStamp_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "WorkspaceArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AigcStamp"
ADD CONSTRAINT "AigcStamp_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
