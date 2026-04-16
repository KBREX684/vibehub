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

CREATE INDEX IF NOT EXISTS "AgentBinding_userId_active_idx" ON "AgentBinding"("userId", "active");

DO $$ BEGIN
  ALTER TABLE "AgentBinding"
    ADD CONSTRAINT "AgentBinding_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
