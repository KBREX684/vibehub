export type Role = "guest" | "user" | "admin";

export type ProjectStatus = "idea" | "building" | "launched" | "paused";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type CollaborationIntentType = "join" | "recruit";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

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
  /** Present when the project is linked to a Team (P3-3). */
  teamId?: string;
  team?: ProjectTeamSummary;
  title: string;
  oneLiner: string;
  description: string;
  techStack: string[];
  tags: string[];
  status: ProjectStatus;
  demoUrl?: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  slug: string;
  authorId: string;
  title: string;
  body: string;
  tags: string[];
  reviewStatus: ReviewStatus;
  moderationNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  /** P2: non-null when marked as 精华 by an admin. */
  featuredAt?: string;
  featuredBy?: string;
  createdAt: string;
}

export type ChallengeStatus = "draft" | "active" | "closed";

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
  /** Comment count on all of this creator's posts */
  receivedCommentCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

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
  createdAt: string;
}

export interface SessionUser {
  userId: string;
  role: Role;
  name: string;
  /** Present when authenticated via API key (P4-2); empty array means unrestricted for backwards compat. */
  apiKeyScopes?: string[];
  /** Present when authenticated via API key (DB path); used for MCP audit. */
  apiKeyId?: string;
}

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

export type InAppNotificationKind =
  | "team_join_request"
  | "team_join_approved"
  | "team_join_rejected"
  | "team_task_assigned";

export interface InAppNotification {
  id: string;
  kind: InAppNotificationKind;
  title: string;
  body: string;
  readAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

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
    | "in_app_notification";
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

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

export type TeamRole = "owner" | "member";

export interface TeamSummary {
  id: string;
  slug: string;
  name: string;
  mission?: string;
  ownerUserId: string;
  memberCount: number;
  projectCount: number;
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
  /** Optional link to a milestone in the same team (P3-7). */
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
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

/** P4: user API key metadata (secret never stored; prefix for display). */
export interface ApiKeySummary {
  id: string;
  label: string;
  prefix: string;
  /** OAuth-style scope strings; always includes `read:public` when created via UI. */
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

/** Returned only once from create. */
export interface ApiKeyCreated extends ApiKeySummary {
  secret: string;
}

export interface TeamDetail extends TeamSummary {
  members: TeamMember[];
  /** Projects linked to this team (P3-3). */
  teamProjects?: TeamProjectCard[];
  /** Set when the viewer has a pending join request for this team. */
  viewerPendingJoinRequest?: boolean;
  /** Owner-only: pending requests awaiting review. */
  pendingJoinRequests?: TeamJoinRequestRow[];
}

export interface CollaborationIntentConversionMetrics {
  totalSubmissions: number;
  pending: number;
  approved: number;
  rejected: number;
  /** approved / totalSubmissions (0 if none). */
  approvalRate: number;
  /** approved / (approved + rejected); 0 if no reviewed intents. */
  reviewedApprovalRate: number;
}

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

/** P3: 信誉系统 — public contribution credit profile. */
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

export type SubscriptionTier = "free" | "pro" | "team_pro";
export type SubscriptionStatus = "active" | "canceled" | "past_due";

/** P3: 商业化 — subscription plan definition. */
export interface SubscriptionPlanInfo {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  priceMonthly: number;
  features: string[];
  apiQuota: number;
}

/** P3: 商业化 — user subscription state. */
export interface UserSubscriptionInfo {
  id: string;
  userId: string;
  plan: SubscriptionPlanInfo;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt?: string;
}
