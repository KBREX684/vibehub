-- P3-3: User-configured webhook endpoints (event bus; HMAC signed payloads from app)
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookEndpoint_userId_active_idx" ON "WebhookEndpoint"("userId", "active");

ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- P3-4: Reserved org invite row (no app workflow yet)
CREATE TABLE "EnterpriseMemberInvite" (
    "id" TEXT NOT NULL,
    "enterpriseProfileId" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "role" "EnterpriseRole" NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseMemberInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnterpriseMemberInvite_enterpriseProfileId_idx" ON "EnterpriseMemberInvite"("enterpriseProfileId");

ALTER TABLE "EnterpriseMemberInvite" ADD CONSTRAINT "EnterpriseMemberInvite_enterpriseProfileId_fkey" FOREIGN KEY ("enterpriseProfileId") REFERENCES "EnterpriseProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
