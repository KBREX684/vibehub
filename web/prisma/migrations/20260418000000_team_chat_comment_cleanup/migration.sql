-- Migration: team_chat_comment_cleanup
-- Adds TeamChatMessage model and chatCapacity to Team

-- Add chatCapacity column to Team
ALTER TABLE "Team" ADD COLUMN "chatCapacity" INTEGER NOT NULL DEFAULT 50;

-- Create TeamChatMessage table
CREATE TABLE "TeamChatMessage" (
    "id"        TEXT NOT NULL,
    "teamId"    TEXT NOT NULL,
    "authorId"  TEXT NOT NULL,
    "body"      VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamChatMessage_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "TeamChatMessage_teamId_createdAt_idx" ON "TeamChatMessage"("teamId", "createdAt");
CREATE INDEX "TeamChatMessage_createdAt_idx" ON "TeamChatMessage"("createdAt");

-- Foreign keys
ALTER TABLE "TeamChatMessage"
    ADD CONSTRAINT "TeamChatMessage_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamChatMessage"
    ADD CONSTRAINT "TeamChatMessage_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
