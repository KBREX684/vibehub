-- M-1/M-2: Subscription tier enums
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'pro', 'team_pro');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'canceled', 'trialing');

-- M-2: Stripe customer ID on User
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- M-1: UserSubscription table
CREATE TABLE "UserSubscription" (
  "id"                   TEXT NOT NULL,
  "userId"               TEXT NOT NULL,
  "tier"                 "SubscriptionTier" NOT NULL DEFAULT 'free',
  "status"               "SubscriptionStatus" NOT NULL DEFAULT 'active',
  "stripeSubscriptionId" TEXT,
  "stripePriceId"        TEXT,
  "currentPeriodEnd"     TIMESTAMP(3),
  "cancelAtPeriodEnd"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSubscription_userId_key"               ON "UserSubscription"("userId");
CREATE UNIQUE INDEX "UserSubscription_stripeSubscriptionId_key" ON "UserSubscription"("stripeSubscriptionId");
CREATE INDEX        "UserSubscription_stripeSubscriptionId_idx" ON "UserSubscription"("stripeSubscriptionId");

ALTER TABLE "UserSubscription"
  ADD CONSTRAINT "UserSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
