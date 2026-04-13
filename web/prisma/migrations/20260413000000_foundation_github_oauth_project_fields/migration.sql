-- F-1: GitHub OAuth fields on User
ALTER TABLE "User" ADD COLUMN "githubId" INTEGER;
ALTER TABLE "User" ADD COLUMN "githubUsername" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;

CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");
CREATE UNIQUE INDEX "User_githubUsername_key" ON "User"("githubUsername");

-- F-3: Project display fields
ALTER TABLE "Project" ADD COLUMN "repoUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "websiteUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Project" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "openSource" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "license" TEXT;
