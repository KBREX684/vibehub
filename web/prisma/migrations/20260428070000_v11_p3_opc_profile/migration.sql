-- CreateTable
CREATE TABLE "OpcProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT,
    "summary" TEXT,
    "serviceScope" TEXT,
    "city" TEXT,
    "websiteUrl" TEXT,
    "proofUrl" TEXT,
    "publicCard" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpcProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpcTrustMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ledgerEntryCount" INTEGER NOT NULL DEFAULT 0,
    "snapshotCount" INTEGER NOT NULL DEFAULT 0,
    "stampedArtifactCount" INTEGER NOT NULL DEFAULT 0,
    "publicWorkCount" INTEGER NOT NULL DEFAULT 0,
    "avgResponseHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "registrationDays" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpcTrustMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalAttestationLink" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalAttestationLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpcProfile_userId_key" ON "OpcProfile"("userId");

-- CreateIndex
CREATE INDEX "OpcProfile_publicCard_updatedAt_idx" ON "OpcProfile"("publicCard", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OpcTrustMetric_userId_key" ON "OpcTrustMetric"("userId");

-- CreateIndex
CREATE INDEX "LegalAttestationLink_creatorProfileId_createdAt_idx" ON "LegalAttestationLink"("creatorProfileId", "createdAt");

-- AddForeignKey
ALTER TABLE "OpcProfile"
ADD CONSTRAINT "OpcProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpcTrustMetric"
ADD CONSTRAINT "OpcTrustMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAttestationLink"
ADD CONSTRAINT "LegalAttestationLink_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
