// ─── Core enums ───────────────────────────────────────────────────────────────

export type Role = "guest" | "user" | "admin";
export type EnterpriseVerificationStatus = "none" | "pending" | "approved" | "rejected";
/** P2: Post sort order */
export type PostSortOrder = "recent" | "hot" | "featured";
export type ProjectStatus = "idea" | "building" | "launched" | "paused";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type CollaborationIntentType = "join" | "recruit";
export type ChallengeStatus = "draft" | "active" | "closed";
export type SubscriptionTier = "free" | "pro" | "team_pro";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing";

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** F-1: GitHub OAuth */
  githubId?: number;
  githubUsername?: string;
  avatarUrl?: string;
  /** M-2: Stripe */
  stripeCustomerId?: string;
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
  team?: ProjectTeamSummary;
  title: string;
  oneLiner: string;
  description: string;
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
  updatedAt: string;
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
  message: string;
  contact?: string;
  status: ReviewStatus;
  reviewNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  /** T-4: tracks conversion to team membership */
  convertedToTeamMembership: boolean;
  createdAt: string;
}

// ─── Session / Auth ───────────────────────────────────────────────────────────

export interface SessionUser {
  userId: string;
  role: Role;
  name: string;
  subscriptionTier?: SubscriptionTier;
  enterpriseStatus?: EnterpriseVerificationStatus;
  enterpriseOrganization?: string;
  enterpriseWebsite?: string;
  /** Present when authenticated via API key; empty array means unrestricted. */
  apiKeyScopes?: string[];
  /** Present when authenticated via API key (DB path); used for MCP audit. */
  apiKeyId?: string;
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
  targetType: "post";
  targetId: string;
  reporterId: string;
  reason: string;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type InAppNotificationKind =
  | "team_join_request"
  | "team_join_approved"
  | "team_join_rejected"
  | "team_task_assigned"
  // C-3 social events
  | "post_commented"
  | "comment_replied"
  | "post_liked"
  | "project_bookmarked"
  | "user_followed"
  | "project_intent_received"
  | "post_featured";

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
  action: string;
  entityType:
    | "post"
    | "moderation_case"
    | "report_ticket"
    | "collaboration_intent"
    | "system"
    | "team"
    | "team_join_request"
    | "team_task"
    | "team_milestone"
    | "api_key"
    | "in_app_notification"
    | "enterprise_profile"
    | "enterprise_verification_application";
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/** User API key metadata (secret never stored; prefix for display). */
export interface ApiKeySummary {
  id: string;
  label: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

/** Returned only once from create. */
export interface ApiKeyCreated extends ApiKeySummary {
  secret: string;
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

export type TeamRole = "owner" | "member";

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

export type TeamTaskStatus = "todo" | "doing" | "done";

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
  pendingJoinRequests?: TeamJoinRequestRow[];
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
  actorId: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
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

/** M-1: Per-user subscription record (Stripe-backed). */
export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
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
