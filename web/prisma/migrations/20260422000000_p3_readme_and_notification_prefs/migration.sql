-- P3-FE-3: optional project README (Markdown)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "readmeMarkdown" TEXT;

-- P3-FE-4: notification preference toggles
CREATE TABLE IF NOT EXISTS "NotificationPreference" (
    "userId" TEXT NOT NULL,
    "commentReplies" BOOLEAN NOT NULL DEFAULT true,
    "teamUpdates" BOOLEAN NOT NULL DEFAULT true,
    "collaborationModeration" BOOLEAN NOT NULL DEFAULT true,
    "systemAnnouncements" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
