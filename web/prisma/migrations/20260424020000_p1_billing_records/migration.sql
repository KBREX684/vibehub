-- CreateEnum
CREATE TYPE "BillingRecordStatus" AS ENUM ('pending', 'succeeded', 'failed', 'canceled', 'refunded');

-- CreateTable
CREATE TABLE "BillingRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "paymentProvider" "PaymentProvider" NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "status" "BillingRecordStatus" NOT NULL DEFAULT 'pending',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "externalSessionId" TEXT,
    "externalPaymentId" TEXT,
    "description" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "settledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BillingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingRecord_userId_createdAt_idx" ON "BillingRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BillingRecord_subscriptionId_createdAt_idx" ON "BillingRecord"("subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "BillingRecord_paymentProvider_status_createdAt_idx" ON "BillingRecord"("paymentProvider", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BillingRecord_externalSessionId_idx" ON "BillingRecord"("externalSessionId");

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "UserSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
