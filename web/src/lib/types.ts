// ─── Core enums ───────────────────────────────────────────────────────────────

export type Role = "guest" | "user" | "admin";
export type EnterpriseVerificationStatus = "none" | "pending" | "approved" | "rejected";
/** P2: Post sort order */
export type PostSortOrder = "recent" | "hot" | "featured" | "following" | "recommended";
export type ProjectSortOrder = "latest" | "hot" | "featured" | "recommended";
export type ProjectStatus = "idea" | "building" | "launched" | "paused";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type CollaborationIntentType = "join" | "recruit";
export type CollaborationIntentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "ignored"
  | "blocked"
  | "expired";
export type ChallengeStatus = "draft" | "active" | "closed";
export type SubscriptionTier = "free" | "pro";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing";
export type OAuthAppTokenScope = string;
export type WorkspaceKind = "personal" | "team";
export type AutomationWorkflowRunStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";
export type AutomationWorkflowActionType =
  | "create_team_task"
  | "create_team_discussion"
  | "agent_complete_team_task"
  | "agent_submit_task_review"
  | "request_team_task_delete"
  | "request_team_member_role_change"
  | "send_slack_message"
  | "send_discord_message"
  | "send_feishu_message"
  | "trigger_github_repository_dispatch";

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** P0: bump to revoke existing browser sessions */
  sessionVersion?: number;
  /** P0-1: email auth (optional; mock store uses ISO strings for dates) */
  passwordHash?: string;
  emailVerifiedAt?: string;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  /** F-1: GitHub OAuth */
  githubId?: number;
  githubUsername?: string;
  avatarUrl?: string;
  enterpriseStatus?: EnterpriseVerificationStatus;
  enterpriseOrganization?: string;
  enterpriseWebsite?: string;
  enterpriseAppliedAt?: string;
  enterpriseReviewedAt?: string;
  enterpriseReviewedBy?: string;
  enterpriseUseCase?: string;
}

// ─── Creator / Project ────────────────────────────────────────────────────────

export interface CreatorProfile {
  id: string;
  slug: string;
  userId: string;
  headline: string;
  bio: string;
  skills: string[];
  avatarUrl?: string;
  websiteUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  collaborationPreference: "open" | "invite_only" | "closed";
}

export interface ProjectTeamSummary {
  slug: string;
  name: string;
}

export interface Project {
  id: string;
  slug: string;
  creatorId: string;
  /** Present when the project is linked to a Team. */
  teamId?: string;
  workspaceId?: string;
  team?: ProjectTeamSummary;
  title: string;
  oneLiner: string;
  description: string;
  /** P3-FE-3: optional Markdown README for the project detail page */
  readmeMarkdown?: string;
  techStack: string[];
  tags: string[];
  status: ProjectStatus;
  demoUrl?: string;
  /** F-3: extra display fields */
  repoUrl?: string;
  websiteUrl?: string;
  screenshots: string[];
  logoUrl?: string;
  openSource: boolean;
  license?: string;
  visibility?: "draft" | "public" | "private";
  updatedAt: string;
  /** Admin daily featured slot (C-5) */
  featuredAt?: string;
  featuredRank?: number;
  bookmarkCount?: number;
  recentBookmarkDelta?: number;
  collaborationIntentCount?: number;
  activityScore?: number;
}

// ─── Post / Comment ───────────────────────────────────────────────────────────

export interface Post {
  id: string;
  slug: string;
  authorId: string;
  authorName?: string;
  title: string;
  body: string;
  tags: string[];
  reviewStatus: ReviewStatus;
  moderationNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  /** P2/C-4: admin featured */
  featuredAt?: string;
  featuredBy?: string;
  /** C-1: social counts */
  likeCount: number;
  bookmarkCount: number;
  viewerHasLiked?: boolean;
  viewerHasBookmarked?: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  body: string;
  /** C-2: nested replies (max depth 2) */
  parentCommentId?: string;
  replies?: Comment[];
  createdAt: string;
}

// ─── P2: Challenge ────────────────────────────────────────────────────────────

/** P2: 挑战赛/活动 */
export interface Challenge {
  id: string;
  slug: string;
  title: string;
  description: string;
  rules?: string;
  tags: string[];
  status: ChallengeStatus;
  startDate: string;
  endDate: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

/** P2: 创作者成长面板数据 */
export interface CreatorGrowthStats {
  creatorId: string;
  slug: string;
  headline: string;
  postCount: number;
  commentCount: number;
  projectCount: number;
  featuredPostCount: number;
  collaborationIntentCount: number;
  receivedCommentCount: number;
}

// ─── Collaboration ────────────────────────────────────────────────────────────

export interface CollaborationIntent {
  id: string;
  projectId: string;
  applicantId: string;
  intentType: CollaborationIntentType;
  /** v10 primary structured fields */
  pitch?: string;
  whyYou?: string;
  howCollab?: string;
  /** Legacy field kept for compatibility during migration. */
  message?: string;
  contact?: string;
  status: CollaborationIntentStatus;
  reviewNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  expiresAt?: string;
  /** T-4: tracks conversion to team membership */
  convertedToTeamMembership: boolean;
  createdAt: string;
}

export interface WorkspaceSummary {
  id: string;
  kind: WorkspaceKind;
  slug: string;
  title: string;
  subtitle?: string;
  teamSlug?: string;
  memberCount?: number;
}

export interface WorkLibraryItem extends Project {
  workspaceTitle: string;
  workspaceSlug: string;
  workspaceKind: WorkspaceKind;
  collaborationIntentCount: number;
}

export interface WorkspaceProjectReference {
  id: string;
  slug: string;
  title: string;
  openSource: boolean;
}

export type WorkspaceArtifactValidationState = "pending" | "ready" | "rejected";

export interface WorkspaceArtifact {
  id: string;
  workspaceId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  uploaderUserId: string;
  uploaderName?: string;
  visibility: "workspace";
  validationState: WorkspaceArtifactValidationState;
  publicUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSnapshot {
  id: string;
  workspaceId: string;
  title: string;
  summary: string;
  goal?: string;
  roleNotes?: string;
  projectIds: string[];
  projects: WorkspaceProjectReference[];
  previousSnapshotId?: string;
  previousSnapshotTitle?: string;
  createdByUserId: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkspaceDeliverableStatus = "draft" | "submitted" | "approved" | "rejected";

export interface WorkspaceDeliverable {
  id: string;
  workspaceId: string;
  snapshotId: string;
  snapshotTitle?: string;
  title: string;
  description?: string;
  status: WorkspaceDeliverableStatus;
  createdByUserId: string;
  createdByName?: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  submittedAt?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkIntentTab = "received" | "sent" | "accepted" | "declined" | "expired";

export interface WorkIntentInboxItem extends CollaborationIntent {
  projectSlug: string;
  projectTitle: string;
  applicantName: string;
  applicantEmail?: string;
  ownerUserId?: string;
}

export type WorkAgentTaskStatus = "running" | "pending_confirm" | "done" | "failed";

export interface WorkAgentTaskItem {
  id: string;
  source: "agent_task";
  status: WorkAgentTaskStatus;
  action: string;
  targetType: string;
  targetId: string;
  title: string;
  subtitle: string;
  scope: WorkspaceKind;
  workspaceId?: string;
  workspaceSlug?: string;
  workspaceTitle?: string;
  teamId?: string;
  teamSlug?: string;
  teamName?: string;
  agentBindingId?: string;
  agentLabel?: string;
  confirmationRequestId?: string;
  confirmationStatus?: AgentConfirmationStatus;
  canDecideConfirmation?: boolean;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

// ─── Session / Auth ───────────────────────────────────────────────────────────

export interface SessionUser {
  userId: string;
  role: Role;
  name: string;
  /** P0: must match User.sessionVersion or the session is rejected */
  sessionVersion?: number;
  subscriptionTier?: SubscriptionTier;
  enterpriseStatus?: EnterpriseVerificationStatus;
  enterpriseOrganization?: string;
  enterpriseWebsite?: string;
  /** Present when authenticated via API key; empty array means unrestricted. */
  apiKeyScopes?: string[];
  /** Present when authenticated via API key (DB path); used for MCP audit. */
  apiKeyId?: string;
  /** Present when an API key is linked to a named agent binding. */
  agentBindingId?: string;
  /** Present when authenticated via OAuth app access token. */
  oauthAppId?: string;
  oauthAppClientId?: string;
}

// ─── Moderation ───────────────────────────────────────────────────────────────

export interface ModerationCase {
  id: string;
  targetType: "post";
  targetId: string;
  status: ReviewStatus;
  reason?: string;
  note?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ReportTicket {
  id: string;
  targetType: "post" | "collaboration_intent";
  targetId: string;
  reporterId: string;
  reason: string;
  status: "open" | "closed";
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  /** Admin API only — persisted AI triage record (W7). */
  adminAi?: AdminAiSuggestionRecord;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type InAppNotificationKind =
  | "team_join_request"
  | "team_join_approved"
  | "team_join_rejected"
  | "team_task_assigned"
  | "team_task_ready_for_review"
  | "team_task_reviewed"
  | "agent_confirmation_required"
  // C-3 social events
  | "post_commented"
  | "comment_replied"
  | "post_liked"
  | "project_bookmarked"
  | "user_followed"
  | "project_intent_received"
  | "post_featured"
  | "collaboration_intent_status_update";

export interface InAppNotification {
  id: string;
  kind: InAppNotificationKind;
  title: string;
  body: string;
  readAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── API Keys / Audit ─────────────────────────────────────────────────────────

export interface McpInvokeAuditRow {
  id: string;
  tool: string;
  userId: string;
  apiKeyId?: string;
  agentBindingId?: string;
  httpStatus: number;
  clientIp?: string;
  userAgent?: string;
  errorCode?: string;
  durationMs?: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  agentBindingId?: string;
  action: string;
  entityType:
    | "post"
    | "project"
    | "moderation_case"
    | "report_ticket"
    | "collaboration_intent"
    | "system"
    | "team"
    | "team_join_request"
    | "team_discussion"
    | "team_task_comment"
    | "team_task"
    | "team_milestone"
    | "workspace_snapshot"
    | "workspace_artifact"
    | "workspace_deliverable"
    | "api_key"
    | "team_membership"
    | "in_app_notification"
    | "enterprise_profile"
    | "enterprise_verification_application";
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AgentBindingSummary {
  id: string;
  label: string;
  agentType: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** v8 W3: role cards an agent may hold inside a team. */
export type TeamAgentRole =
  | "reader"
  | "commenter"
  | "executor"
  | "reviewer"
  | "coordinator";

export interface TeamAgentMembershipSummary {
  id: string;
  teamId: string;
  teamSlug?: string;
  teamName?: string;
  agentBindingId: string;
  agentLabel?: string;
  agentType?: string;
  ownerUserId: string;
  ownerName?: string;
  role: TeamAgentRole;
  grantedByUserId: string;
  grantedByName?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  /** Last recorded action by this agent in the team (null if no audit yet). */
  lastActionAt?: string | null;
}

export interface OAuthAppSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  clientId: string;
  redirectUris: string[];
  scopes: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthAppCreated extends OAuthAppSummary {
  clientSecret: string;
}

export interface AutomationWorkflowStepSummary {
  id: string;
  sortOrder: number;
  actionType: AutomationWorkflowActionType;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationWorkflowSummary {
  id: string;
  userId: string;
  agentBindingId?: string;
  agentBindingLabel?: string;
  name: string;
  description?: string;
  triggerEvent: string;
  filterJson?: Record<string, unknown>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  steps: AutomationWorkflowStepSummary[];
}

export interface AutomationWorkflowRunSummary {
  id: string;
  workflowId: string;
  workflowName?: string;
  userId: string;
  event: string;
  status: AutomationWorkflowRunStatus;
  triggerPayload?: Record<string, unknown>;
  resultSummary?: string;
  createdAt: string;
  completedAt?: string;
}

export type AgentActionStatus = "succeeded" | "confirmation_required" | "rejected";

export interface AgentActionAuditRow {
  id: string;
  actorUserId: string;
  agentBindingId: string;
  apiKeyId?: string;
  teamId?: string;
  taskId?: string;
  action: string;
  outcome: AgentActionStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type AgentConfirmationStatus = "pending" | "approved" | "rejected" | "canceled";

export interface AgentConfirmationRequest {
  id: string;
  requesterUserId: string;
  agentBindingId: string;
  apiKeyId?: string;
  teamId?: string;
  teamSlug?: string;
  taskId?: string;
  taskTitle?: string;
  targetType: string;
  targetId: string;
  action: string;
  reason?: string;
  payload: Record<string, unknown>;
  status: AgentConfirmationStatus;
  decidedByUserId?: string;
  decidedByName?: string;
  decidedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

/** User API key metadata (secret never stored; prefix for display). */
export interface ApiKeySummary {
  id: string;
  label: string;
  prefix: string;
  scopes: string[];
  agentBindingId?: string;
  agentBinding?: AgentBindingSummary;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  /** ISO — key invalid after this instant if set */
  expiresAt?: string;
}

/** Returned only once from create. */
export interface ApiKeyCreated extends ApiKeySummary {
  secret: string;
}

export interface ApiKeyUsageSummary {
  last7dCount: number;
  last24hCount: number;
  successCount: number;
  errorCount: number;
  avgDurationMs: number;
  uniqueTools: number;
  lastUsedAt?: string;
}

export interface ApiKeyUsageDailyBucket {
  date: string;
  count: number;
  successCount: number;
  errorCount: number;
}

export interface ApiKeyUsageSnapshot {
  summary: ApiKeyUsageSummary;
  daily: ApiKeyUsageDailyBucket[];
  recentInvocations: McpInvokeAuditRow[];
}

// ─── Topics / Leaderboards ────────────────────────────────────────────────────

export interface CollectionTopic {
  slug: string;
  title: string;
  description: string;
  tag: string;
}

export interface LeaderboardDiscussionRow {
  postId: string;
  slug: string;
  title: string;
  commentCount: number;
}

export interface LeaderboardProjectRow {
  projectId: string;
  slug: string;
  title: string;
  intentCount: number;
}

export type WeeklyLeaderboardKind =
  | "discussions_by_weekly_comment_count"
  | "projects_by_weekly_collaboration_intent_count";

export interface WeeklyLeaderboardMaterializedRow {
  rank: number;
  entityId: string;
  slug: string;
  title: string;
  score: number;
}

export interface WeeklyLeaderboardMaterializedSnapshot {
  weekStart: string;
  generatedAt: string;
  kind: WeeklyLeaderboardKind;
  rows: WeeklyLeaderboardMaterializedRow[];
}

export type WeeklyLeaderboardSource = "materialized" | "live";

export interface WeeklyLeaderboardPublicPayload {
  weekStart: string;
  kind: WeeklyLeaderboardKind;
  source: WeeklyLeaderboardSource;
  generatedAt?: string;
  rows: WeeklyLeaderboardMaterializedRow[];
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export type TeamRole = "owner" | "admin" | "member" | "reviewer";

export interface TeamSummary {
  id: string;
  slug: string;
  name: string;
  mission?: string;
  ownerUserId: string;
  memberCount: number;
  projectCount: number;
  /** T-1: external chat links */
  discordUrl?: string;
  telegramUrl?: string;
  slackUrl?: string;
  /** T-3: GitHub integration */
  githubOrgUrl?: string;
  githubRepoUrl?: string;
  createdAt: string;
}

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: TeamRole;
  joinedAt: string;
}

export type TeamJoinRequestStatus = "pending" | "approved" | "rejected";

export interface TeamJoinRequestRow {
  id: string;
  teamId: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  message: string;
  status: TeamJoinRequestStatus;
  reviewedAt?: string;
  createdAt: string;
}

export interface TeamProjectCard {
  slug: string;
  title: string;
  oneLiner: string;
}

export type TeamTaskStatus = "todo" | "doing" | "review" | "done" | "rejected";

export interface TeamTask {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  status: TeamTaskStatus;
  sortOrder: number;
  milestoneId?: string;
  milestoneTitle?: string;
  createdByUserId: string;
  createdByName: string;
  assigneeUserId?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  reviewRequestedAt?: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMilestone {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  targetDate: string;
  completed: boolean;
  sortOrder: number;
  /** T-2: visibility */
  visibility: "team_only" | "public";
  /** T-2: 0-100 progress */
  progress: number;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamDetail extends TeamSummary {
  members: TeamMember[];
  teamProjects?: TeamProjectCard[];
  viewerPendingJoinRequest?: boolean;
  viewerRole?: TeamRole;
  pendingJoinRequests?: TeamJoinRequestRow[];
}

export interface TeamDiscussion {
  id: string;
  teamId: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamTaskComment {
  id: string;
  teamId: string;
  taskId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollaborationIntentConversionMetrics {
  totalSubmissions: number;
  pending: number;
  approved: number;
  rejected: number;
  approvalRate: number;
  reviewedApprovalRate: number;
}

// ─── P3: Reputation / Contribution Credits ────────────────────────────────────

/** P3: Team-scoped activity log entry. */
export interface TeamActivityLogEntry {
  id: string;
  kind: "task" | "discussion" | "workspace" | "confirmation" | "agent";
  actorId: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  summary?: string;
  createdAt: string;
}

/** P3: Public contribution credit profile. */
export interface ContributionCreditProfile {
  userId: string;
  score: number;
  tasksCompleted: number;
  milestonesHit: number;
  joinRequestsMade: number;
  postsAuthored: number;
  commentsAuthored: number;
  projectsCreated: number;
  intentsApproved: number;
  postLikesReceived: number;
  projectBookmarksReceived: number;
  followerCount: number;
  updatedAt: string;
}

// ─── M-1/M-2: Subscription ────────────────────────────────────────────────────

/** P3: Legacy subscription info format (plan-based). */
export interface UserSubscriptionInfo {
  id: string;
  userId: string;
  plan: SubscriptionPlanInfo;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt?: string;
}

/** P3: Subscription plan definition. */
export interface SubscriptionPlanInfo {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  priceMonthly: number;
  features: string[];
  apiQuota: number;
}

/** M-1: Per-user subscription record (billing-provider-backed). */
export type PaymentProviderKind = "alipay";
export type BillingRecordStatus = "pending" | "succeeded" | "failed" | "canceled" | "refunded";

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  paymentProvider?: PaymentProviderKind;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  enterpriseStatus?: EnterpriseVerificationStatus;
  enterpriseRequestedAt?: string;
  enterpriseReviewedAt?: string;
  enterpriseReviewedBy?: string;
  enterpriseOrgName?: string;
  enterpriseOrgWebsite?: string;
  enterpriseWorkEmail?: string;
  enterpriseUseCase?: string;
  enterpriseReviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingRecord {
  id: string;
  userId: string;
  subscriptionId?: string;
  paymentProvider: PaymentProviderKind;
  tier: SubscriptionTier;
  status: BillingRecordStatus;
  amountCents: number;
  currency: string;
  externalSessionId?: string;
  externalPaymentId?: string;
  description?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  settledAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAiInsight {
  suggestion: string;
  riskLevel: "low" | "medium" | "high";
  confidence?: number;
  priority?: "low" | "normal" | "high" | "urgent";
  queue?: string;
  labels?: string[];
}

export type AdminAiSuggestionTargetValue =
  | "report_ticket"
  | "enterprise_verification"
  | "post_review"
  | "other";

export type AdminAiDecisionValue = "pending" | "accepted" | "rejected" | "modified";

export interface AdminAiSuggestionRecord extends AdminAiInsight {
  id: string;
  targetType: AdminAiSuggestionTargetValue;
  targetId: string;
  adminDecision: AdminAiDecisionValue;
  decisionNote?: string;
  adminUserId?: string;
  decidedAt?: string;
  modelProvider?: string;
  modelName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDashboardMetric {
  key:
    | "wahc"
    | "ao_rate"
    | "agent_rejection_rate"
    | "dau"
    | "new_users"
    | "new_posts"
    | "new_projects"
    | "active_subscriptions"
    | "open_reports";
  label: string;
  description: string;
  value: number;
  delta7d: number;
  sparkline: number[];
}

export interface AdminDashboardSnapshot {
  generatedAt: string;
  northStars: AdminDashboardMetric[];
  supportMetrics: AdminDashboardMetric[];
}

export type SystemAlertSeverity = "info" | "warning" | "critical";
export type SystemAlertDeliveryStatus = "pending" | "sent" | "skipped" | "failed";

export interface SystemAlertRecord {
  id: string;
  kind: string;
  severity: SystemAlertSeverity;
  message: string;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
  deliveryStatus: SystemAlertDeliveryStatus;
  deliverySummary?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

// ─── P4: Enterprise / Embed ───────────────────────────────────────────────────

export interface EnterpriseProfile {
  userId: string;
  status: EnterpriseVerificationStatus;
  organizationName: string;
  organizationWebsite: string;
  workEmail: string;
  useCase?: string;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
  /** Admin API only — persisted AI triage record (W7). */
  adminAi?: AdminAiSuggestionRecord;
}

export interface EnterpriseVerificationApplication {
  id: string;
  userId: string;
  organizationName: string;
  organizationWebsite: string;
  workEmail: string;
  useCase?: string;
  status: Exclude<EnterpriseVerificationStatus, "none">;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** P4: Embeddable card payload for external sites. */
export interface EmbedProjectCard {
  slug: string;
  title: string;
  oneLiner: string;
  status: ProjectStatus;
  techStack: string[];
  tags: string[];
  team?: { slug: string; name: string };
  updatedAt: string;
  vibehubUrl: string;
}

export interface EmbedTeamCard {
  slug: string;
  name: string;
  mission?: string;
  memberCount: number;
  projectCount: number;
  vibehubUrl: string;
}

/** P4: Project radar entry with trending score. */
export interface ProjectRadarEntry {
  slug: string;
  title: string;
  oneLiner: string;
  status: ProjectStatus;
  techStack: string[];
  score: number;
}

/** P4: Talent radar entry. */
export interface TalentRadarEntry {
  creatorSlug: string;
  headline: string;
  skills: string[];
  collaborationPreference: string;
  contributionScore: number;
  projectCount: number;
}

/** P4: Due diligence summary for a single project. */
export interface ProjectDueDiligence {
  slug: string;
  title: string;
  oneLiner: string;
  description: string;
  status: ProjectStatus;
  techStack: string[];
  tags: string[];
  team?: { slug: string; name: string; memberCount: number };
  commentCount: number;
  collaborationIntentCount: number;
  creatorSlug?: string;
  creatorHeadline?: string;
  updatedAt: string;
}

/** P4: Ecosystem report payload. */
export interface EcosystemReport {
  period: string;
  generatedAt: string;
  metrics: {
    totalUsers: number;
    totalProjects: number;
    totalPosts: number;
    totalComments: number;
    totalTeams: number;
    totalCollaborationIntents: number;
    approvedIntents: number;
    activeChallenge: number;
    topProjectsByIntents: Array<{ slug: string; title: string; count: number }>;
    topDiscussionsByComments: Array<{ slug: string; title: string; count: number }>;
    topCreatorsByScore: Array<{ userId: string; score: number }>;
  };
}

// ─── C-1: Social Interactions ─────────────────────────────────────────────────

export interface PostLike {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface PostBookmark {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface ProjectBookmark {
  id: string;
  userId: string;
  projectId: string;
  createdAt: string;
}

export interface UserFollow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

// ─── C-6/A-3: GitHub / Search ─────────────────────────────────────────────────

export interface GitHubRepoStats {
  stars: number;
  forks: number;
  language: string | null;
  lastPushedAt: string | null;
  openIssues: number;
  cachedAt: string;
}

export interface SearchResult {
  type: "post" | "project" | "creator";
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags?: string[];
}

/** P3-3: user webhook endpoint (secret never returned after create). */
export interface WebhookEndpointSummary {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEndpointCreated extends WebhookEndpointSummary {
  secret: string;
}

// ─── Team Chat ────────────────────────────────────────────────────────────────

/** Persisted team chat message (REST history, not live WS). */
export interface TeamChatMessage {
  id: string;
  teamId: string;
  teamSlug: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

/** Response from GET /api/v1/teams/[slug]/chat/messages */
export interface TeamChatHistoryResponse {
  messages: TeamChatMessage[];
  /** ISO timestamp — messages older than this are cleaned up */
  retainedSince: string;
}
