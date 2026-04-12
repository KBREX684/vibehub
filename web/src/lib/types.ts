export type Role = "guest" | "user" | "admin";

export type ProjectStatus = "idea" | "building" | "launched" | "paused";
export type ReviewStatus = "pending" | "approved" | "rejected";

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
  entityType: "post" | "moderation_case" | "report_ticket";
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
