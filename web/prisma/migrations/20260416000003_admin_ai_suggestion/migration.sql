-- CreateEnum
CREATE TYPE "AdminAiSuggestionTarget" AS ENUM ('report_ticket', 'enterprise_verification', 'post_review', 'other');

CREATE TYPE "AdminAiRiskLevel" AS ENUM ('low', 'medium', 'high');

CREATE TYPE "AdminAiDecision" AS ENUM ('pending', 'accepted', 'rejected', 'modified');

-- CreateTable
CREATE TABLE "AdminAiSuggestion" (
    "id" TEXT NOT NULL,
    "targetType" "AdminAiSuggestionTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "riskLevel" "AdminAiRiskLevel" NOT NULL DEFAULT 'low',
    "confidence" DOUBLE PRECISION,
    "adminDecision" "AdminAiDecision" NOT NULL DEFAULT 'pending',
    "adminUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAiSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAiSuggestion_targetType_targetId_idx" ON "AdminAiSuggestion"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "AdminAiSuggestion" ADD CONSTRAINT "AdminAiSuggestion_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
