-- P2-BE-3: Add VARCHAR length constraints to key string fields.
-- Constraints mirror the Zod validation at the API layer so that any direct-DB
-- writes that bypass the API are also bounded.
--
-- Safe to run on a database seeded through the app (all rows satisfy the limits).
-- On an unclean database: migration will fail on rows that violate the limits,
-- surfacing a data-quality issue that must be fixed before constraint enforcement.

-- User.name: GitHub display names are max 255 characters.
ALTER TABLE "User"
  ALTER COLUMN "name" TYPE VARCHAR(255);

-- CreatorProfile: slug (max 48), headline (max 200), bio (max 2000).
ALTER TABLE "CreatorProfile"
  ALTER COLUMN "slug"     TYPE VARCHAR(48),
  ALTER COLUMN "headline" TYPE VARCHAR(200),
  ALTER COLUMN "bio"      TYPE VARCHAR(2000);

-- Project: slug (max 100), title (max 120), oneLiner (max 200).
ALTER TABLE "Project"
  ALTER COLUMN "slug"     TYPE VARCHAR(100),
  ALTER COLUMN "title"    TYPE VARCHAR(120),
  ALTER COLUMN "oneLiner" TYPE VARCHAR(200);

-- Post: slug (max 220, title-derived + dedup suffix), title (max 120).
ALTER TABLE "Post"
  ALTER COLUMN "slug"  TYPE VARCHAR(220),
  ALTER COLUMN "title" TYPE VARCHAR(120);

-- Team: slug (max 48), name (max 80), mission (max 500).
ALTER TABLE "Team"
  ALTER COLUMN "slug"    TYPE VARCHAR(48),
  ALTER COLUMN "name"    TYPE VARCHAR(80),
  ALTER COLUMN "mission" TYPE VARCHAR(500);
