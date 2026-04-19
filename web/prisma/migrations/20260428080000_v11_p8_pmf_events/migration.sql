CREATE TABLE "PmfEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmfEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PmfEvent_event_createdAt_idx" ON "PmfEvent"("event", "createdAt");
CREATE INDEX "PmfEvent_userId_createdAt_idx" ON "PmfEvent"("userId", "createdAt");

ALTER TABLE "PmfEvent"
ADD CONSTRAINT "PmfEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
