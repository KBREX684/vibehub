-- Foundation migration: create base enums and tables that were missing from the
-- migration history.  Every subsequent migration (20260412120000+) assumes these
-- objects already exist.

-- ──────────────────────────────── Enums ────────────────────────────────────────

CREATE TYPE "Role" AS ENUM ('guest', 'user', 'admin');

CREATE TYPE "ProjectStatus" AS ENUM ('idea', 'building', 'launched', 'paused');

CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE "CollaborationIntentType" AS ENUM ('join', 'recruit');

-- Required by the enterprise-profile migration (20260419000000) which backfills
-- from User columns, and by the EnterpriseMemberInvite table (20260420000000).
CREATE TYPE "EnterpriseVerificationStatus" AS ENUM ('none', 'pending', 'approved', 'rejected');

CREATE TYPE "EnterpriseRole" AS ENUM ('member', 'admin');

-- ──────────────────────────────── Tables ───────────────────────────────────────
-- Column sets here reflect the state *before* any subsequent ALTER TABLE.  Later
-- migrations add githubId, avatarUrl, stripeCustomerId, sessionVersion, etc.

-- User -----------------------------------------------------------------------
-- Includes enterprise columns that are dropped by 20260419000000.
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "enterpriseStatus" "EnterpriseVerificationStatus" NOT NULL DEFAULT 'none',
    "enterpriseOrganization" TEXT,
    "enterpriseWebsite" TEXT,
    "enterpriseUseCase" TEXT,
    "enterpriseRole" "EnterpriseRole",
    "enterpriseAppliedAt" TIMESTAMP(3),
    "enterpriseReviewedAt" TIMESTAMP(3),
    "enterpriseReviewedBy" TEXT,
    "enterpriseReviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreatorProfile -------------------------------------------------------------
CREATE TABLE "CreatorProfile" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "skills" TEXT[],
    "collaborationPreference" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorProfile_slug_key" ON "CreatorProfile"("slug");
CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "CreatorProfile"("userId");

ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Project --------------------------------------------------------------------
-- Bare columns only; repoUrl, websiteUrl, screenshots, logoUrl, openSource,
-- license, teamId, featuredRank, featuredAt, searchVector, readmeMarkdown are
-- added by later migrations.
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "oneLiner" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "techStack" TEXT[],
    "tags" TEXT[],
    "status" "ProjectStatus" NOT NULL DEFAULT 'idea',
    "demoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE INDEX "Project_creatorId_idx" ON "Project"("creatorId");

ALTER TABLE "Project" ADD CONSTRAINT "Project_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Post -----------------------------------------------------------------------
-- searchVector, featuredAt, featuredBy are added by later migrations.
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" TEXT[],
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "moderationNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");
CREATE INDEX "Post_reviewStatus_idx" ON "Post"("reviewStatus");
CREATE INDEX "Post_reviewedBy_idx" ON "Post"("reviewedBy");

ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_reviewedBy_fkey"
    FOREIGN KEY ("reviewedBy") REFERENCES "User"("id");

-- Comment --------------------------------------------------------------------
-- parentCommentId is added by 20260413100000_community_c1_c7.
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ModerationCase -------------------------------------------------------------
CREATE TABLE "ModerationCase" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "postId" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModerationCase_status_idx" ON "ModerationCase"("status");
CREATE INDEX "ModerationCase_targetType_targetId_idx" ON "ModerationCase"("targetType", "targetId");

ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_resolvedBy_fkey"
    FOREIGN KEY ("resolvedBy") REFERENCES "User"("id");

-- ReportTicket ---------------------------------------------------------------
-- status starts as TEXT; converted to enum by 20260421001000_p2_status_enums.
CREATE TABLE "ReportTicket" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "postId" TEXT,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "ReportTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportTicket_status_idx" ON "ReportTicket"("status");
CREATE INDEX "ReportTicket_targetType_targetId_idx" ON "ReportTicket"("targetType", "targetId");

ALTER TABLE "ReportTicket" ADD CONSTRAINT "ReportTicket_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportTicket" ADD CONSTRAINT "ReportTicket_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportTicket" ADD CONSTRAINT "ReportTicket_resolvedBy_fkey"
    FOREIGN KEY ("resolvedBy") REFERENCES "User"("id");

-- AuditLog -------------------------------------------------------------------
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CollaborationIntent --------------------------------------------------------
-- convertedToTeamMembership is added by 20260413200000_team_t1_t4.
CREATE TABLE "CollaborationIntent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "intentType" "CollaborationIntentType" NOT NULL,
    "message" TEXT NOT NULL,
    "contact" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollaborationIntent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollaborationIntent_projectId_idx" ON "CollaborationIntent"("projectId");
CREATE INDEX "CollaborationIntent_applicantId_idx" ON "CollaborationIntent"("applicantId");
CREATE INDEX "CollaborationIntent_status_idx" ON "CollaborationIntent"("status");
CREATE INDEX "CollaborationIntent_reviewedBy_idx" ON "CollaborationIntent"("reviewedBy");

ALTER TABLE "CollaborationIntent" ADD CONSTRAINT "CollaborationIntent_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationIntent" ADD CONSTRAINT "CollaborationIntent_applicantId_fkey"
    FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationIntent" ADD CONSTRAINT "CollaborationIntent_reviewedBy_fkey"
    FOREIGN KEY ("reviewedBy") REFERENCES "User"("id");
