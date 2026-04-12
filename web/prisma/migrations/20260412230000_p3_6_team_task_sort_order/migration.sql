-- AlterTable
ALTER TABLE "TeamTask" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "TeamTask_teamId_sortOrder_idx" ON "TeamTask"("teamId", "sortOrder");
