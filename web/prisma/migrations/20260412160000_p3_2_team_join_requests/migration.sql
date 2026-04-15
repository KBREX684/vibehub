-- CreateEnum
CREATE TYPE "TeamJoinRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "TeamJoinRequest" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "status" "TeamJoinRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamJoinRequest_teamId_status_idx" ON "TeamJoinRequest"("teamId", "status");

-- CreateIndex
CREATE INDEX "TeamJoinRequest_applicantId_idx" ON "TeamJoinRequest"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamJoinRequest_teamId_applicantId_key" ON "TeamJoinRequest"("teamId", "applicantId");

-- AddForeignKey
ALTER TABLE "TeamJoinRequest" ADD CONSTRAINT "TeamJoinRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamJoinRequest" ADD CONSTRAINT "TeamJoinRequest_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
