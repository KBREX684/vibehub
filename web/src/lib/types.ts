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

export interface Project {
  id: string;
  slug: string;
  creatorId: string;
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

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  entityType: "post" | "moderation_case" | "report_ticket" | "collaboration_intent" | "system" | "team";
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
  createdAt: string;
}

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: TeamRole;
  joinedAt: string;
}

export interface TeamDetail extends TeamSummary {
  members: TeamMember[];
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
