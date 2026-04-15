-- CreateTable
CREATE TABLE "McpInvokeAudit" (
    "id" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "httpStatus" INTEGER NOT NULL,
    "clientIp" TEXT,
    "userAgent" TEXT,
    "errorCode" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpInvokeAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "McpInvokeAudit_createdAt_idx" ON "McpInvokeAudit"("createdAt");

-- CreateIndex
CREATE INDEX "McpInvokeAudit_userId_createdAt_idx" ON "McpInvokeAudit"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "McpInvokeAudit_tool_createdAt_idx" ON "McpInvokeAudit"("tool", "createdAt");
