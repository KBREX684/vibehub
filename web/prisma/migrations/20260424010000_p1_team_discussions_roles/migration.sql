ALTER TYPE "TeamRole" ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE "TeamRole" ADD VALUE IF NOT EXISTS 'reviewer';

CREATE TABLE IF NOT EXISTS "TeamDiscussion" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamDiscussion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeamTaskComment" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamTaskComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TeamDiscussion_teamId_createdAt_idx" ON "TeamDiscussion"("teamId", "createdAt");
CREATE INDEX IF NOT EXISTS "TeamDiscussion_authorId_createdAt_idx" ON "TeamDiscussion"("authorId", "createdAt");
CREATE INDEX IF NOT EXISTS "TeamTaskComment_teamId_createdAt_idx" ON "TeamTaskComment"("teamId", "createdAt");
CREATE INDEX IF NOT EXISTS "TeamTaskComment_taskId_createdAt_idx" ON "TeamTaskComment"("taskId", "createdAt");
CREATE INDEX IF NOT EXISTS "TeamTaskComment_authorId_createdAt_idx" ON "TeamTaskComment"("authorId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "TeamDiscussion"
    ADD CONSTRAINT "TeamDiscussion_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TeamDiscussion"
    ADD CONSTRAINT "TeamDiscussion_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TeamTaskComment"
    ADD CONSTRAINT "TeamTaskComment_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TeamTaskComment"
    ADD CONSTRAINT "TeamTaskComment_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "TeamTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TeamTaskComment"
    ADD CONSTRAINT "TeamTaskComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
