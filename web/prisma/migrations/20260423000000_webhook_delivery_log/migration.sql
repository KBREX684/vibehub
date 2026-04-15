-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('pending', 'success', 'failed');

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "webhookEndpointId" TEXT,
    "event" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL,
    "httpStatus" INTEGER,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookDelivery_userId_createdAt_idx" ON "WebhookDelivery"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookEndpointId_idx" ON "WebhookDelivery"("webhookEndpointId");

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookEndpointId_fkey" FOREIGN KEY ("webhookEndpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
