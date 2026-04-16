-- CreateEnum
CREATE TYPE "AutomationWorkflowRunStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "AutomationWorkflowActionType" AS ENUM (
  'create_team_task',
  'create_team_discussion',
  'agent_complete_team_task',
  'agent_submit_task_review',
  'request_team_task_delete',
  'request_team_member_role_change',
  'send_slack_message',
  'send_discord_message',
  'send_feishu_message',
  'trigger_github_repository_dispatch'
);

-- AlterTable
ALTER TABLE "ContributionCredit"
  ADD COLUMN "postLikesReceived" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "projectBookmarksReceived" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "followerCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OAuthApp" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "clientId" TEXT NOT NULL,
  "clientSecretHash" TEXT NOT NULL,
  "redirectUris" TEXT[],
  "scopes" TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OAuthApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAuthorizationCode" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "redirectUri" TEXT NOT NULL,
  "scopes" TEXT[],
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OAuthAuthorizationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccessToken" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "scopes" TEXT[],
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OAuthAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationWorkflow" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "agentBindingId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "triggerEvent" TEXT NOT NULL,
  "filterJson" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AutomationWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationWorkflowStep" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "actionType" "AutomationWorkflowActionType" NOT NULL,
  "config" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AutomationWorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationWorkflowRun" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "status" "AutomationWorkflowRunStatus" NOT NULL DEFAULT 'pending',
  "triggerPayload" JSONB,
  "resultSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "AutomationWorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthApp_clientId_key" ON "OAuthApp"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthApp_userId_slug_key" ON "OAuthApp"("userId", "slug");

-- CreateIndex
CREATE INDEX "OAuthApp_userId_active_idx" ON "OAuthApp"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAuthorizationCode_codeHash_key" ON "OAuthAuthorizationCode"("codeHash");

-- CreateIndex
CREATE INDEX "OAuthAuthorizationCode_appId_userId_idx" ON "OAuthAuthorizationCode"("appId", "userId");

-- CreateIndex
CREATE INDEX "OAuthAuthorizationCode_expiresAt_idx" ON "OAuthAuthorizationCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccessToken_tokenHash_key" ON "OAuthAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "OAuthAccessToken_appId_revokedAt_idx" ON "OAuthAccessToken"("appId", "revokedAt");

-- CreateIndex
CREATE INDEX "OAuthAccessToken_userId_createdAt_idx" ON "OAuthAccessToken"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationWorkflow_userId_active_idx" ON "AutomationWorkflow"("userId", "active");

-- CreateIndex
CREATE INDEX "AutomationWorkflow_triggerEvent_active_idx" ON "AutomationWorkflow"("triggerEvent", "active");

-- CreateIndex
CREATE INDEX "AutomationWorkflow_agentBindingId_idx" ON "AutomationWorkflow"("agentBindingId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationWorkflowStep_workflowId_sortOrder_key" ON "AutomationWorkflowStep"("workflowId", "sortOrder");

-- CreateIndex
CREATE INDEX "AutomationWorkflowStep_workflowId_idx" ON "AutomationWorkflowStep"("workflowId");

-- CreateIndex
CREATE INDEX "AutomationWorkflowRun_workflowId_createdAt_idx" ON "AutomationWorkflowRun"("workflowId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationWorkflowRun_userId_createdAt_idx" ON "AutomationWorkflowRun"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "OAuthApp" ADD CONSTRAINT "OAuthApp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAuthorizationCode" ADD CONSTRAINT "OAuthAuthorizationCode_appId_fkey" FOREIGN KEY ("appId") REFERENCES "OAuthApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAuthorizationCode" ADD CONSTRAINT "OAuthAuthorizationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccessToken" ADD CONSTRAINT "OAuthAccessToken_appId_fkey" FOREIGN KEY ("appId") REFERENCES "OAuthApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccessToken" ADD CONSTRAINT "OAuthAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationWorkflow" ADD CONSTRAINT "AutomationWorkflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationWorkflow" ADD CONSTRAINT "AutomationWorkflow_agentBindingId_fkey" FOREIGN KEY ("agentBindingId") REFERENCES "AgentBinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationWorkflowStep" ADD CONSTRAINT "AutomationWorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationWorkflowRun" ADD CONSTRAINT "AutomationWorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationWorkflowRun" ADD CONSTRAINT "AutomationWorkflowRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
