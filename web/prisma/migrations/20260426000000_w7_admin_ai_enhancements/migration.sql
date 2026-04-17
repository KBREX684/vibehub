ALTER TABLE "AdminAiSuggestion"
ADD COLUMN IF NOT EXISTS "queue" TEXT,
ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS "labels" JSONB,
ADD COLUMN IF NOT EXISTS "decisionNote" TEXT,
ADD COLUMN IF NOT EXISTS "modelProvider" TEXT,
ADD COLUMN IF NOT EXISTS "modelName" TEXT,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "AdminAiSuggestion"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS DISTINCT FROM "createdAt";

CREATE INDEX IF NOT EXISTS "AdminAiSuggestion_queue_createdAt_idx"
ON "AdminAiSuggestion"("queue", "createdAt");

CREATE INDEX IF NOT EXISTS "AdminAiSuggestion_adminDecision_riskLevel_createdAt_idx"
ON "AdminAiSuggestion"("adminDecision", "riskLevel", "createdAt");
