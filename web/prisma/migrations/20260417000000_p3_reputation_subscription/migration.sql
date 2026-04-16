-- P3: ContributionCredit
CREATE TABLE "ContributionCredit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "milestonesHit" INTEGER NOT NULL DEFAULT 0,
    "joinRequestsMade" INTEGER NOT NULL DEFAULT 0,
    "postsAuthored" INTEGER NOT NULL DEFAULT 0,
    "commentsAuthored" INTEGER NOT NULL DEFAULT 0,
    "projectsCreated" INTEGER NOT NULL DEFAULT 0,
    "intentsApproved" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContributionCredit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContributionCredit_userId_key" ON "ContributionCredit"("userId");
CREATE INDEX "ContributionCredit_score_idx" ON "ContributionCredit"("score");

-- P3: Subscription enums (already created by monetization_m1_m2; skip if present)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionTier') THEN
    CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'pro', 'team_pro');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'canceled', 'past_due');
  END IF;
END $$;

-- P3: SubscriptionPlan and duplicate UserSubscription are skipped — the
-- canonical UserSubscription (with Stripe fields) was created by
-- monetization_m1_m2.  SubscriptionPlan is not in the final schema and would
-- block the v4_simplify SubscriptionTier enum migration.
