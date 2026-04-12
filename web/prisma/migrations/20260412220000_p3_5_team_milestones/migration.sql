-- CreateTable
CREATE TABLE "TeamMilestone" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamMilestone_teamId_idx" ON "TeamMilestone"("teamId");

-- CreateIndex
CREATE INDEX "TeamMilestone_teamId_completed_idx" ON "TeamMilestone"("teamId", "completed");

-- CreateIndex
CREATE INDEX "TeamMilestone_teamId_sortOrder_idx" ON "TeamMilestone"("teamId", "sortOrder");

-- AddForeignKey
ALTER TABLE "TeamMilestone" ADD CONSTRAINT "TeamMilestone_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMilestone" ADD CONSTRAINT "TeamMilestone_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
