CREATE TABLE IF NOT EXISTS "AgentBinding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentBinding_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "agentBindingId" TEXT;
ALTER TABLE "McpInvokeAudit" ADD COLUMN IF NOT EXISTS "agentBindingId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "agentBindingId" TEXT;

CREATE INDEX IF NOT EXISTS "AgentBinding_userId_active_idx" ON "AgentBinding"("userId", "active");
CREATE INDEX IF NOT EXISTS "ApiKey_agentBindingId_idx" ON "ApiKey"("agentBindingId");
CREATE INDEX IF NOT EXISTS "McpInvokeAudit_agentBindingId_createdAt_idx" ON "McpInvokeAudit"("agentBindingId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_agentBindingId_createdAt_idx" ON "AuditLog"("agentBindingId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "AgentBinding"
    ADD CONSTRAINT "AgentBinding_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ApiKey"
    ADD CONSTRAINT "ApiKey_agentBindingId_fkey"
    FOREIGN KEY ("agentBindingId") REFERENCES "AgentBinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "McpInvokeAudit"
    ADD CONSTRAINT "McpInvokeAudit_agentBindingId_fkey"
    FOREIGN KEY ("agentBindingId") REFERENCES "AgentBinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_agentBindingId_fkey"
    FOREIGN KEY ("agentBindingId") REFERENCES "AgentBinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
