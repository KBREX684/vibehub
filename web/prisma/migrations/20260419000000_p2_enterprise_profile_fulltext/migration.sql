-- P2-3: EnterpriseProfile table + backfill from User; remove enterprise columns from User
CREATE TABLE "EnterpriseProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EnterpriseVerificationStatus" NOT NULL DEFAULT 'none',
    "organization" TEXT,
    "website" TEXT,
    "useCase" TEXT,
    "role" "EnterpriseRole",
    "logoUrl" TEXT,
    "industry" TEXT,
    "appliedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnterpriseProfile_userId_key" ON "EnterpriseProfile"("userId");

CREATE INDEX "EnterpriseProfile_status_idx" ON "EnterpriseProfile"("status");

ALTER TABLE "EnterpriseProfile" ADD CONSTRAINT "EnterpriseProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "EnterpriseProfile" (
    "id",
    "userId",
    "status",
    "organization",
    "website",
    "useCase",
    "role",
    "appliedAt",
    "reviewedAt",
    "reviewedBy",
    "reviewNote",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    u."id",
    u."enterpriseStatus",
    u."enterpriseOrganization",
    u."enterpriseWebsite",
    u."enterpriseUseCase",
    u."enterpriseRole",
    u."enterpriseAppliedAt",
    u."enterpriseReviewedAt",
    u."enterpriseReviewedBy",
    u."enterpriseReviewNote",
    COALESCE(u."enterpriseAppliedAt", u."createdAt"),
    COALESCE(u."enterpriseReviewedAt", u."enterpriseAppliedAt", u."updatedAt")
FROM "User" u
WHERE
    u."enterpriseStatus" IS DISTINCT FROM 'none'
    OR u."enterpriseAppliedAt" IS NOT NULL
    OR u."enterpriseOrganization" IS NOT NULL
    OR u."enterpriseWebsite" IS NOT NULL;

INSERT INTO "EnterpriseProfile" (
    "id",
    "userId",
    "status",
    "organization",
    "website",
    "useCase",
    "role",
    "appliedAt",
    "reviewedAt",
    "reviewedBy",
    "reviewNote",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    u."id",
    'none',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    u."createdAt",
    u."updatedAt"
FROM "User" u
WHERE NOT EXISTS (SELECT 1 FROM "EnterpriseProfile" ep WHERE ep."userId" = u."id");

ALTER TABLE "User" DROP COLUMN "enterpriseStatus";
ALTER TABLE "User" DROP COLUMN "enterpriseOrganization";
ALTER TABLE "User" DROP COLUMN "enterpriseWebsite";
ALTER TABLE "User" DROP COLUMN "enterpriseUseCase";
ALTER TABLE "User" DROP COLUMN "enterpriseAppliedAt";
ALTER TABLE "User" DROP COLUMN "enterpriseReviewedAt";
ALTER TABLE "User" DROP COLUMN "enterpriseReviewedBy";
ALTER TABLE "User" DROP COLUMN "enterpriseReviewNote";
ALTER TABLE "User" DROP COLUMN "enterpriseRole";

-- P2-1: Full-text search vectors + GIN indexes
-- Project and Post searchVector may already exist from community_c1_c7; guard with DO blocks.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Project' AND column_name = 'searchVector'
  ) THEN
    ALTER TABLE "Project" ADD COLUMN "searchVector" tsvector
      GENERATED ALWAYS AS (
        to_tsvector(
          'english',
          coalesce(title, '') || ' ' || coalesce("oneLiner", '') || ' ' || coalesce(description, '')
        )
      ) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Project_searchVector_idx" ON "Project" USING GIN ("searchVector");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Post' AND column_name = 'searchVector'
  ) THEN
    ALTER TABLE "Post" ADD COLUMN "searchVector" tsvector
      GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
      ) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Post_searchVector_idx" ON "Post" USING GIN ("searchVector");

-- Immutable wrapper for array_to_string.  The built-in is classified STABLE
-- (it accepts any element type, so PG can't guarantee immutability in general),
-- but for text[] with a text separator the result is fully deterministic.
-- Declaring IMMUTABLE here is safe and required for GENERATED ALWAYS columns.
CREATE OR REPLACE FUNCTION immutable_array_to_string(arr text[], sep text)
  RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $fn$ SELECT array_to_string(arr, sep) $fn$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'CreatorProfile' AND column_name = 'searchVector'
  ) THEN
    ALTER TABLE "CreatorProfile" ADD COLUMN "searchVector" tsvector
      GENERATED ALWAYS AS (
        to_tsvector(
          'english'::regconfig,
          coalesce(slug, '') || ' ' || coalesce(headline, '') || ' ' || coalesce(bio, '') || ' ' || immutable_array_to_string(skills, ' ')
        )
      ) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CreatorProfile_searchVector_idx" ON "CreatorProfile" USING GIN ("searchVector");
