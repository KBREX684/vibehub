-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN "scopes" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill existing keys with P4-2 default read scopes (same as application DEFAULT_API_KEY_SCOPES)
UPDATE "ApiKey" SET "scopes" = '["read:public","read:teams:self","read:teams:list","read:team:detail","read:team:tasks","read:team:milestones","read:projects:list","read:projects:detail","read:creators:list","read:creators:detail","read:topics:list","read:topics:detail"]'::jsonb;

-- Application supplies scopes on insert; no DB default after backfill
ALTER TABLE "ApiKey" ALTER COLUMN "scopes" DROP DEFAULT;
