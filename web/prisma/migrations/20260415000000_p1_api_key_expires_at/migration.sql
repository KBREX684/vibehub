-- P1: optional API key expiration for rotation policies
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
