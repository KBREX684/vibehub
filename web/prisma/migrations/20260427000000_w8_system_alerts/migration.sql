CREATE TYPE "SystemAlertSeverity" AS ENUM ('info', 'warning', 'critical');
CREATE TYPE "SystemAlertDeliveryStatus" AS ENUM ('pending', 'sent', 'skipped', 'failed');

CREATE TABLE "SystemAlert" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" "SystemAlertSeverity" NOT NULL DEFAULT 'warning',
    "message" TEXT NOT NULL,
    "dedupeKey" TEXT,
    "metadata" JSONB,
    "deliveryStatus" "SystemAlertDeliveryStatus" NOT NULL DEFAULT 'pending',
    "deliverySummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "SystemAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SystemAlert_kind_createdAt_idx" ON "SystemAlert"("kind", "createdAt");
CREATE INDEX "SystemAlert_severity_createdAt_idx" ON "SystemAlert"("severity", "createdAt");
CREATE INDEX "SystemAlert_resolvedAt_createdAt_idx" ON "SystemAlert"("resolvedAt", "createdAt");
CREATE INDEX "SystemAlert_dedupeKey_createdAt_idx" ON "SystemAlert"("dedupeKey", "createdAt");
