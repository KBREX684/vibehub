-- P2-2: idempotency ledger for future MCP write tools
CREATE TABLE "McpInvokeIdempotency" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpInvokeIdempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "McpInvokeIdempotency_userId_tool_key_key" ON "McpInvokeIdempotency"("userId", "tool", "key");

CREATE INDEX "McpInvokeIdempotency_userId_createdAt_idx" ON "McpInvokeIdempotency"("userId", "createdAt");
