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

-- P3: Subscription enums
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'pro', 'team_pro');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'canceled', 'past_due');

-- P3: SubscriptionPlan
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceMonthly" INTEGER NOT NULL DEFAULT 0,
    "features" TEXT[],
    "apiQuota" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPlan_tier_key" ON "SubscriptionPlan"("tier");

-- P3: UserSubscription
CREATE TABLE "UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSubscription_userId_planId_key" ON "UserSubscription"("userId", "planId");
CREATE INDEX "UserSubscription_userId_idx" ON "UserSubscription"("userId");
CREATE INDEX "UserSubscription_status_idx" ON "UserSubscription"("status");

ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
