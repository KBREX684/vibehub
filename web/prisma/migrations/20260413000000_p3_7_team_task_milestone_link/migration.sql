-- AlterTable
ALTER TABLE "TeamTask" ADD COLUMN     "milestoneId" TEXT;

-- CreateIndex
CREATE INDEX "TeamTask_teamId_milestoneId_idx" ON "TeamTask"("teamId", "milestoneId");

-- AddForeignKey
ALTER TABLE "TeamTask" ADD CONSTRAINT "TeamTask_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "TeamMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
