-- v10 Phase 1: introduce first-class Workspace ownership and backfill
-- existing projects into personal/team workspaces.

-- CreateEnum
CREATE TYPE "WorkspaceKind" AS ENUM ('personal', 'team');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "kind" "WorkspaceKind" NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_userId_key" ON "Workspace"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_teamId_key" ON "Workspace"("teamId");

-- CreateIndex
CREATE INDEX "Workspace_kind_idx" ON "Workspace"("kind");

-- AddColumn
ALTER TABLE "Project" ADD COLUMN "workspaceId" TEXT;

-- Backfill one personal workspace per user.
INSERT INTO "Workspace" ("id", "kind", "slug", "title", "userId", "createdAt", "updatedAt")
SELECT
  'ws_user_' || u.id,
  'personal'::"WorkspaceKind",
  'personal-' || u.id,
  'Personal Workspace',
  u.id,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u;

-- Backfill one team workspace per team.
INSERT INTO "Workspace" ("id", "kind", "slug", "title", "teamId", "createdAt", "updatedAt")
SELECT
  'ws_team_' || t.id,
  'team'::"WorkspaceKind",
  t.slug,
  t.name,
  t.id,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Team" t;

-- Backfill project ownership to the matching team workspace when linked to a team,
-- otherwise fall back to the creator's personal workspace.
UPDATE "Project" p
SET "workspaceId" = COALESCE(
  (
    SELECT w."id"
    FROM "Workspace" w
    WHERE w."teamId" = p."teamId"
    LIMIT 1
  ),
  (
    SELECT w."id"
    FROM "Workspace" w
    JOIN "CreatorProfile" cp ON cp."userId" = w."userId"
    WHERE cp."id" = p."creatorId"
      AND w."kind" = 'personal'::"WorkspaceKind"
    LIMIT 1
  )
);

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ownership invariant: a workspace is either personal (user-owned) or team-owned.
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_kind_owner_check"
CHECK (
  ("kind" = 'personal'::"WorkspaceKind" AND "userId" IS NOT NULL AND "teamId" IS NULL)
  OR
  ("kind" = 'team'::"WorkspaceKind" AND "teamId" IS NOT NULL AND "userId" IS NULL)
);

-- CreateIndex
CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");
