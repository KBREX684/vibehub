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
ALTER TABLE "Project" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' || coalesce("oneLiner", '') || ' ' || coalesce(description, '')
    )
  ) STORED;

CREATE INDEX "Project_searchVector_idx" ON "Project" USING GIN ("searchVector");

ALTER TABLE "Post" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) STORED;

CREATE INDEX "Post_searchVector_idx" ON "Post" USING GIN ("searchVector");

ALTER TABLE "CreatorProfile" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(slug, '') || ' ' || coalesce(headline, '') || ' ' || coalesce(bio, '') || ' ' || coalesce(array_to_string(skills, ' '), '')
    )
  ) STORED;

CREATE INDEX "CreatorProfile_searchVector_idx" ON "CreatorProfile" USING GIN ("searchVector");
