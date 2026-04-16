-- P2: Add featured fields to Post (featuredAt may already exist from community_c1_c7)
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "featuredAt" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "featuredBy" TEXT;

-- P2: Index for featured posts (may already exist from community_c1_c7)
CREATE INDEX IF NOT EXISTS "Post_featuredAt_idx" ON "Post"("featuredAt");

-- P2: FK from Post.featuredBy → User.id
ALTER TABLE "Post" ADD CONSTRAINT "Post_featuredBy_fkey" FOREIGN KEY ("featuredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- P2: Challenge status enum
CREATE TYPE "ChallengeStatus" AS ENUM ('draft', 'active', 'closed');

-- P2: Challenge model
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rules" TEXT,
    "tags" TEXT[],
    "status" "ChallengeStatus" NOT NULL DEFAULT 'draft',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Challenge_slug_key" ON "Challenge"("slug");
CREATE INDEX "Challenge_status_idx" ON "Challenge"("status");
CREATE INDEX "Challenge_startDate_endDate_idx" ON "Challenge"("startDate", "endDate");

ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
