-- CreateEnum
CREATE TYPE "WeeklyLeaderboardKind" AS ENUM ('discussions_by_weekly_comment_count', 'projects_by_weekly_collaboration_intent_count');

-- CreateTable
CREATE TABLE "WeeklyLeaderboardSnapshot" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "kind" "WeeklyLeaderboardKind" NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyLeaderboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyLeaderboardRow" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "entityId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "WeeklyLeaderboardRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyLeaderboardSnapshot_weekStart_idx" ON "WeeklyLeaderboardSnapshot"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyLeaderboardSnapshot_weekStart_kind_key" ON "WeeklyLeaderboardSnapshot"("weekStart", "kind");

-- CreateIndex
CREATE INDEX "WeeklyLeaderboardRow_snapshotId_idx" ON "WeeklyLeaderboardRow"("snapshotId");

-- AddForeignKey
ALTER TABLE "WeeklyLeaderboardRow" ADD CONSTRAINT "WeeklyLeaderboardRow_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WeeklyLeaderboardSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
