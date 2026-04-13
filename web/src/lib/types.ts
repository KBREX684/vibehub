export type Role = "guest" | "user" | "admin";

export type ProjectStatus = "idea" | "building" | "launched" | "paused";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type CollaborationIntentType = "join" | "recruit";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  githubId?: number;
  githubUsername?: string;
  avatarUrl?: string;
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
  repoUrl?: string;
  websiteUrl?: string;
  screenshots: string[];
  logoUrl?: string;
  openSource: boolean;
  license?: string;
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
  createdAt: string;
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
