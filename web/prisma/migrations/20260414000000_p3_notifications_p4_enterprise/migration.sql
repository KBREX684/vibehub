-- CreateEnum
CREATE TYPE "InAppNotificationKind" AS ENUM ('team_join_request', 'team_join_approved', 'team_join_rejected', 'team_task_assigned');

-- CreateTable
CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "InAppNotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InAppNotification_userId_readAt_idx" ON "InAppNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "InAppNotification_userId_createdAt_idx" ON "InAppNotification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
