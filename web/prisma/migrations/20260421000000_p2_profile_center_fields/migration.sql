-- P2-FE-3: profile center editable fields on CreatorProfile
ALTER TABLE "CreatorProfile"
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "githubUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "twitterUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT;
