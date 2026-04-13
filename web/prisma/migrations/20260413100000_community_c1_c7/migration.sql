-- C-1: Social interactions
CREATE TABLE "UserFollow" (
  "id" TEXT NOT NULL,
  "followerId" TEXT NOT NULL,
  "followingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserFollow_followerId_followingId_key" ON "UserFollow"("followerId", "followingId");
CREATE INDEX "UserFollow_followerId_idx" ON "UserFollow"("followerId");
CREATE INDEX "UserFollow_followingId_idx" ON "UserFollow"("followingId");
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PostLike" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PostLike_userId_postId_key" ON "PostLike"("userId", "postId");
CREATE INDEX "PostLike_postId_idx" ON "PostLike"("postId");
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PostBookmark" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostBookmark_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PostBookmark_userId_postId_key" ON "PostBookmark"("userId", "postId");
CREATE INDEX "PostBookmark_userId_idx" ON "PostBookmark"("userId");
CREATE INDEX "PostBookmark_postId_idx" ON "PostBookmark"("postId");
ALTER TABLE "PostBookmark" ADD CONSTRAINT "PostBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostBookmark" ADD CONSTRAINT "PostBookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProjectBookmark" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectBookmark_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectBookmark_userId_projectId_key" ON "ProjectBookmark"("userId", "projectId");
CREATE INDEX "ProjectBookmark_userId_idx" ON "ProjectBookmark"("userId");
CREATE INDEX "ProjectBookmark_projectId_idx" ON "ProjectBookmark"("projectId");
ALTER TABLE "ProjectBookmark" ADD CONSTRAINT "ProjectBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBookmark" ADD CONSTRAINT "ProjectBookmark_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- C-2: Nested comments
ALTER TABLE "Comment" ADD COLUMN "parentCommentId" TEXT;
CREATE INDEX "Comment_parentCommentId_idx" ON "Comment"("parentCommentId");
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- C-3: Extend InAppNotificationKind enum
ALTER TYPE "InAppNotificationKind" ADD VALUE IF NOT EXISTS 'post_commented';
ALTER TYPE "InAppNotificationKind" ADD VALUE IF NOT EXISTS 'comment_replied';
ALTER TYPE "InAppNotificationKind" ADD VALUE IF NOT EXISTS 'post_liked';
ALTER TYPE "InAppNotificationKind" ADD VALUE IF NOT EXISTS 'project_bookmarked';
ALTER TYPE "InAppNotificationKind" ADD VALUE IF NOT EXISTS 'user_followed';
ALTER TYPE "InAppNotificationKind" ADD VALUE IF NOT EXISTS 'project_intent_received';
ALTER TYPE "InAppNotificationKind" ADD VALUE IF NOT EXISTS 'post_featured';

-- C-4: Post featured for curated feed
ALTER TABLE "Post" ADD COLUMN "featuredAt" TIMESTAMP(3);
CREATE INDEX "Post_featuredAt_idx" ON "Post"("featuredAt");

-- C-5: Project daily featured rank
ALTER TABLE "Project" ADD COLUMN "featuredRank" INTEGER;
ALTER TABLE "Project" ADD COLUMN "featuredAt" TIMESTAMP(3);
CREATE INDEX "Project_featuredRank_idx" ON "Project"("featuredRank");

-- C-7: Full-text search vectors
ALTER TABLE "Post" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))) STORED;
CREATE INDEX "Post_searchVector_idx" ON "Post" USING GIN("searchVector");

ALTER TABLE "Project" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce("oneLiner", '') || ' ' || coalesce(description, ''))) STORED;
CREATE INDEX "Project_searchVector_idx" ON "Project" USING GIN("searchVector");
