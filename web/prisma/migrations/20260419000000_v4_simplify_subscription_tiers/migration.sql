-- v4.0: Simplify subscription tiers from (free, pro, team_pro) to (free, pro).
-- Migrate any existing team_pro subscriptions to pro before dropping the enum value.

UPDATE "UserSubscription" SET "tier" = 'pro' WHERE "tier" = 'team_pro';

-- Recreate the enum without team_pro
ALTER TYPE "SubscriptionTier" RENAME TO "SubscriptionTier_old";
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'pro');
ALTER TABLE "UserSubscription" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "UserSubscription" ALTER COLUMN "tier" TYPE "SubscriptionTier" USING ("tier"::text::"SubscriptionTier");
ALTER TABLE "UserSubscription" ALTER COLUMN "tier" SET DEFAULT 'free';
DROP TYPE "SubscriptionTier_old";
