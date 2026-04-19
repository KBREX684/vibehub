CREATE TYPE "CollaborationIntentStatus" AS ENUM ('pending', 'approved', 'rejected', 'ignored', 'blocked', 'expired');

ALTER TABLE "CollaborationIntent"
  ADD COLUMN "pitch" TEXT,
  ADD COLUMN "whyYou" TEXT,
  ADD COLUMN "howCollab" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "CollaborationIntent"
SET
  "pitch" = CASE
    WHEN "message" LIKE 'WHO:%WHY:%HOW:%'
      THEN NULLIF(BTRIM(split_part(split_part("message", E'\n\nWHY:', 1), E'WHO:\n', 2)), '')
    ELSE NULLIF(BTRIM("message"), '')
  END,
  "whyYou" = CASE
    WHEN "message" LIKE 'WHO:%WHY:%HOW:%'
      THEN NULLIF(BTRIM(split_part(split_part("message", E'\n\nHOW:', 1), E'\n\nWHY:\n', 2)), '')
    ELSE NULL
  END,
  "howCollab" = CASE
    WHEN "message" LIKE 'WHO:%WHY:%HOW:%'
      THEN NULLIF(BTRIM(split_part("message", E'\n\nHOW:\n', 2)), '')
    ELSE NULL
  END,
  "expiresAt" = "createdAt" + INTERVAL '30 days';

ALTER TABLE "CollaborationIntent"
  ADD COLUMN "status_v2" "CollaborationIntentStatus" NOT NULL DEFAULT 'pending';

UPDATE "CollaborationIntent"
SET "status_v2" = CASE
  WHEN "status"::TEXT = 'approved' THEN 'approved'::"CollaborationIntentStatus"
  WHEN "status"::TEXT = 'rejected' THEN 'rejected'::"CollaborationIntentStatus"
  WHEN "status"::TEXT = 'pending' AND "createdAt" + INTERVAL '30 days' < NOW() THEN 'expired'::"CollaborationIntentStatus"
  ELSE 'pending'::"CollaborationIntentStatus"
END;

ALTER TABLE "CollaborationIntent" DROP COLUMN "status";
ALTER TABLE "CollaborationIntent" RENAME COLUMN "status_v2" TO "status";
