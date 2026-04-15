import { assertContentSafeText, assertUrlCountAtMost, escapeHtmlAngleBrackets } from "@/lib/content-safety";
import { assertPublicHttpsUrl } from "@/lib/private-network-url";
import { incrementContributionCreditField, contributionWeights } from "@/lib/contribution-credit-increment";
import { dispatchNotificationPush } from "@/lib/push-dispatcher";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher";
import { WEBHOOK_EVENT_NAMES, isWebhookEventName } from "@/lib/webhook-events";
import { paginateArray } from "@/lib/pagination";
import { COLLECTION_TOPICS } from "@/lib/topics-config";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { mapPrismaToRepositoryError, RepositoryError } from "@/lib/repository-errors";
import { hashApiKeyToken, generateApiKeyPlaintext, isApiKeyTokenFormat } from "@/lib/api-key-crypto";
import { DEFAULT_API_KEY_SCOPES, normalizeApiKeyScopes } from "@/lib/api-key-scopes";
import {
  enterpriseProfileSelect,
  sessionEnterpriseFromProfile,
} from "@/lib/enterprise-profile-db";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { creatorFtsWhereClause, postFtsWhereClause, projectFtsWhereClause } from "@/lib/fts-sql";
import {
  mockApiKeys,
} from "@/lib/data/mock-api-keys";
import {
  mockAuditLogs,
  mockComments,
  mockCollaborationIntents,
  mockCreators,
  mockModerationCases,
  mockPosts,
  mockProjects,
  mockReportTickets,
  mockTeamJoinRequests,
  mockTeamMemberships,
  mockTeamMilestones,
  mockInAppNotifications,
  mockTeamTasks,
  mockTeams,
  mockUsers,
  mockPostLikes,
  mockPostBookmarks,
  mockProjectBookmarks,
  mockUserFollows,
  mockChallenges,
  mockContributionCredits,
  mockSubscriptionPlans,
  mockUserSubscriptions,
  mockEnterpriseVerificationApplications,
  mockTeamChatMessages,
  mockWebhookEndpoints,
} from "@/lib/data/mock-data";
import type {
  ApiKeyCreated,
  ApiKeySummary,
  AuditLog,
  CollaborationIntent,
  CollaborationIntentConversionMetrics,
  CollaborationIntentType,
  CollectionTopic,
  Comment,
  CreatorProfile,
  GitHubRepoStats,
  InAppNotification,
  InAppNotificationKind,
  McpInvokeAuditRow,
  LeaderboardDiscussionRow,
  LeaderboardProjectRow,
  ModerationCase,
  Post,
  Project,
  ReportTicket,
  ReviewStatus,
  Role,
  SearchResult,
  WebhookEndpointSummary,
  WebhookEndpointCreated,
  SessionUser,
  TeamDetail,
  TeamJoinRequestRow,
  TeamJoinRequestStatus,
  TeamMember,
  TeamMilestone,
  TeamRole,
  TeamSummary,
  TeamTask,
  TeamTaskStatus,
  User,
  UserSubscription,
  UserSubscriptionInfo,
  SubscriptionTier,
  Challenge,
  ChallengeStatus,
  ContributionCreditProfile,
  CreatorGrowthStats,
  EmbedProjectCard,
  EmbedTeamCard,
  EcosystemReport,
  ProjectDueDiligence,
  ProjectRadarEntry,
  SubscriptionPlanInfo,
  TalentRadarEntry,
  TeamActivityLogEntry,
  WeeklyLeaderboardKind,
  WeeklyLeaderboardMaterializedRow,
  WeeklyLeaderboardMaterializedSnapshot,
  WeeklyLeaderboardPublicPayload,
  TeamChatMessage,
  EnterpriseProfile,
  EnterpriseVerificationApplication,
  EnterpriseVerificationStatus,
} from "@/lib/types";
import { checkTeamMemberLimit } from "@/lib/subscription";
import {
  getEnterpriseProfileByUserId as getEnterpriseProfileByUserIdFromDomain,
  listEnterpriseProfiles as listEnterpriseProfilesFromDomain,
  reviewEnterpriseVerification as reviewEnterpriseVerificationFromDomain,
  submitEnterpriseVerification as submitEnterpriseVerificationFromDomain,
} from "@/lib/repositories/enterprise.repository";
import {
  getUserSubscription as getUserSubscriptionFromDomain,
  getUserTier as getUserTierFromDomain,
  upsertUserSubscription as upsertUserSubscriptionFromDomain,
} from "@/lib/repositories/billing.repository";
import {
  createProject as createProjectFromDomain,
  deleteProject as deleteProjectFromDomain,
  getProjectBySlug as getProjectBySlugFromDomain,
  getProjectFilterFacets as getProjectFilterFacetsFromDomain,
  listProjects as listProjectsFromDomain,
  updateProject as updateProjectFromDomain,
  updateProjectTeamLink as updateProjectTeamLinkFromDomain,
} from "@/lib/repositories/project.repository";
import {
  createTeam as createTeamFromDomain,
  getTeamBySlug as getTeamBySlugFromDomain,
  listTeams as listTeamsFromDomain,
} from "@/lib/repositories/team.repository";
import {
  createPost as createPostFromDomain,
  getPostBySlug as getPostBySlugFromDomain,
  listPosts as listPostsFromDomain,
} from "@/lib/repositories/community.repository";
import {
  listTeamsForUser as listTeamsForUserFromShared,
  listPendingJoinRequestsForOwner as listPendingJoinRequestsForOwnerFromShared,
} from "@/lib/repositories/repository-shared";

const useMockData = isMockDataEnabled();
type DemoRole = Extract<Role, "admin" | "user">;

const mockWeeklySnapshots = new Map<string, WeeklyLeaderboardMaterializedSnapshot>();

/** Monday 00:00:00.000 UTC for the ISO week containing `date`. */
export function startOfUtcWeekContaining(date: Date): Date {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = utc.getUTCDay();
  const daysFromMonday = (dow + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - daysFromMonday);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}

function weeklySnapshotKey(weekStart: Date, kind: WeeklyLeaderboardKind): string {
  return `${kind}:${weekStart.toISOString()}`;
}

export function parseUtcWeekStartParam(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) {
    return null;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const candidate = new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
  const normalized = startOfUtcWeekContaining(candidate);
  if (
    normalized.getUTCFullYear() !== candidate.getUTCFullYear() ||
    normalized.getUTCMonth() !== candidate.getUTCMonth() ||
    normalized.getUTCDate() !== candidate.getUTCDate()
  ) {
    return null;
  }
  return normalized;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  /** P4-3: opaque cursor for next page (only when cursor mode was used). */
  nextCursor?: string;
}

interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

interface ReviewPostInput {
  postId: string;
  action: "approve" | "reject";
  note?: string;
  adminUserId: string;
}

interface ReviewCollaborationIntentInput {
  intentId: string;
  action: "approve" | "reject";
  note?: string;
  /** Actor id stored as reviewer (admin or project owner). */
  adminUserId: string;
  /**
   * When set, the intent must belong to a project whose creator is this user.
   * Used when a project owner reviews via the admin queue (same payload as legacy admin-only flow).
   */
  projectOwnerUserId?: string;
  /** When admin approves a join intent and the project has a team, add applicant as member */
  inviteApplicantToTeamOnApprove?: boolean;
}

export async function getPrisma() {
  const db = await import("@/lib/db");
  return db.prisma;
}

function normalizeModerationNote(note?: string): string | undefined {
  const value = note?.trim();
  return value ? value.slice(0, 500) : undefined;
}

function toProjectDto(project: {
  id: string;
  slug: string;
  creatorId: string;
  teamId: string | null;
  title: string;
  oneLiner: string;
  description: string;
  readmeMarkdown?: string | null;
  techStack: string[];
  tags: string[];
  status: Project["status"];
  demoUrl: string | null;
  repoUrl?: string | null;
  websiteUrl?: string | null;
  screenshots?: string[];
  logoUrl?: string | null;
  openSource?: boolean;
  license?: string | null;
  updatedAt: Date;
  featuredAt?: Date | null;
  featuredRank?: number | null;
  team?: { slug: string; name: string } | null;
}): Project {
  const base: Project = {
    id: project.id,
    slug: project.slug,
    creatorId: project.creatorId,
    title: project.title,
    oneLiner: project.oneLiner,
    description: project.description,
    readmeMarkdown: project.readmeMarkdown ?? undefined,
    techStack: project.techStack,
    tags: project.tags,
    status: project.status,
    demoUrl: project.demoUrl ?? undefined,
    repoUrl: project.repoUrl ?? undefined,
    websiteUrl: project.websiteUrl ?? undefined,
    screenshots: project.screenshots ?? [],
    logoUrl: project.logoUrl ?? undefined,
    openSource: project.openSource ?? false,
    license: project.license ?? undefined,
    updatedAt: project.updatedAt.toISOString(),
  };
  if (project.featuredAt) {
    base.featuredAt = project.featuredAt.toISOString();
  }
  if (project.featuredRank != null) {
    base.featuredRank = project.featuredRank;
  }
  if (project.teamId) {
    base.teamId = project.teamId;
  }
  if (project.team) {
    base.team = { slug: project.team.slug, name: project.team.name };
  }
  return base;
}

function toCreatorDto(creator: {
  id: string;
  slug: string;
  userId: string;
  headline: string;
  bio: string;
  skills: string[];
  avatarUrl?: string | null;
  websiteUrl?: string | null;
  githubUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  collaborationPreference: string;
}): CreatorProfile {
  const allowedPreference: CreatorProfile["collaborationPreference"] =
    creator.collaborationPreference === "invite_only" || creator.collaborationPreference === "closed"
      ? creator.collaborationPreference
      : "open";

  return {
    id: creator.id,
    slug: creator.slug,
    userId: creator.userId,
    headline: creator.headline,
    bio: creator.bio,
    skills: creator.skills,
    avatarUrl: creator.avatarUrl ?? undefined,
    websiteUrl: creator.websiteUrl ?? undefined,
    githubUrl: creator.githubUrl ?? undefined,
    twitterUrl: creator.twitterUrl ?? undefined,
    linkedinUrl: creator.linkedinUrl ?? undefined,
    collaborationPreference: allowedPreference,
  };
}

function toUserDto(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
}): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

function toPostDto(post: {
  id: string;
  slug: string;
  authorId: string;
  authorName?: string;
  title: string;
  body: string;
  tags: string[];
  reviewStatus: ReviewStatus;
  moderationNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  featuredAt?: Date | null;
  likeCount?: number;
  bookmarkCount?: number;
  viewerHasLiked?: boolean;
  viewerHasBookmarked?: boolean;
  createdAt: Date;
}): Post {
  return {
    id: post.id,
    slug: post.slug,
    authorId: post.authorId,
    authorName: post.authorName,
    title: post.title,
    body: post.body,
    tags: post.tags,
    reviewStatus: post.reviewStatus,
    moderationNote: post.moderationNote ?? undefined,
    reviewedAt: post.reviewedAt?.toISOString(),
    reviewedBy: post.reviewedBy ?? undefined,
    featuredAt: post.featuredAt?.toISOString(),
    likeCount: post.likeCount ?? 0,
    bookmarkCount: post.bookmarkCount ?? 0,
    viewerHasLiked: post.viewerHasLiked,
    viewerHasBookmarked: post.viewerHasBookmarked,
    createdAt: post.createdAt.toISOString(),
  };
}

function toCommentDto(comment: {
  id: string;
  postId: string;
  authorId: string;
  authorName?: string;
  body: string;
  parentCommentId?: string | null;
  createdAt: Date;
  replies?: Array<{
    id: string;
    postId: string;
    authorId: string;
    authorName?: string;
    body: string;
    parentCommentId?: string | null;
    createdAt: Date;
  }>;
}): Comment {
  return {
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    authorName: comment.authorName ?? comment.authorId,
    body: comment.body,
    parentCommentId: comment.parentCommentId ?? undefined,
    replies: comment.replies?.map((r) => toCommentDto(r)),
    createdAt: comment.createdAt.toISOString(),
  };
}

function toCollaborationIntentDto(item: {
  id: string;
  projectId: string;
  applicantId: string;
  intentType: string;
  message: string;
  contact: string | null;
  status: ReviewStatus;
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  convertedToTeamMembership?: boolean;
  createdAt: Date;
}): CollaborationIntent {
  const intentType: CollaborationIntentType = item.intentType === "recruit" ? "recruit" : "join";

  return {
    id: item.id,
    projectId: item.projectId,
    applicantId: item.applicantId,
    intentType,
    message: item.message,
    contact: item.contact ?? undefined,
    status: item.status,
    reviewNote: item.reviewNote ?? undefined,
    reviewedAt: item.reviewedAt?.toISOString(),
    reviewedBy: item.reviewedBy ?? undefined,
    convertedToTeamMembership: item.convertedToTeamMembership ?? false,
    createdAt: item.createdAt.toISOString(),
  };
}

function toModerationCaseDto(item: {
  id: string;
  targetType: string;
  targetId: string;
  status: ReviewStatus;
  reason: string | null;
  note: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}): ModerationCase {
  return {
    id: item.id,
    targetType: "post",
    targetId: item.targetId,
    status: item.status,
    reason: item.reason ?? undefined,
    note: item.note ?? undefined,
    createdAt: item.createdAt.toISOString(),
    resolvedAt: item.resolvedAt?.toISOString(),
    resolvedBy: item.resolvedBy ?? undefined,
  };
}

function toReportTicketDto(item: {
  id: string;
  targetType: string;
  targetId: string;
  reporterId: string;
  reason: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}): ReportTicket {
  return {
    id: item.id,
    targetType: "post",
    targetId: item.targetId,
    reporterId: item.reporterId,
    reason: item.reason,
    status: item.status === "closed" ? "closed" : "open",
    createdAt: item.createdAt.toISOString(),
    resolvedAt: item.resolvedAt?.toISOString(),
    resolvedBy: item.resolvedBy ?? undefined,
  };
}

function toAuditLogDto(item: {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
}): AuditLog {
  return {
    id: item.id,
    actorId: item.actorId,
    action: item.action,
    entityType: item.entityType as AuditLog["entityType"],
    entityId: item.entityId,
    metadata: (item.metadata ?? undefined) as Record<string, unknown> | undefined,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function listProjects(params: {
  query?: string;
  tag?: string;
  /** Matches if any `techStack` entry equals this string (case-sensitive in DB; mock compares case-insensitively). */
  tech?: string;
  status?: Project["status"];
  /** Filter by team slug (P3-3). */
  team?: string;
  /** P1: filter by creator profile ID (not userId). */
  creatorId?: string;
  page: number;
  limit: number;
  /** P4-3: keyset pagination when no full-text query (stable `updatedAt` + `id` sort) */
  cursor?: string | null;
}): Promise<Paginated<Project>> {
  return listProjectsFromDomain(params);
}

export async function getProjectFilterFacets(): Promise<{ tags: string[]; techStack: string[] }> {
  return getProjectFilterFacetsFromDomain();
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  return getProjectBySlugFromDomain(slug);
}

export async function updateProjectTeamLink(params: {
  projectSlug: string;
  actorUserId: string;
  teamSlug: string | null;
}): Promise<Project> {
  return updateProjectTeamLinkFromDomain(params);
}

function userNameById(userId: string): string {
  return mockUsers.find((u) => u.id === userId)?.name ?? "Unknown";
}

function toTeamJoinRequestRowMock(r: {
  id: string;
  teamId: string;
  applicantId: string;
  message: string;
  status: TeamJoinRequestStatus;
  reviewedAt?: string;
  createdAt: string;
}): TeamJoinRequestRow {
  const u = mockUsers.find((x) => x.id === r.applicantId);
  return {
    id: r.id,
    teamId: r.teamId,
    applicantId: r.applicantId,
    applicantName: u?.name ?? "Unknown",
    applicantEmail: u?.email ?? "",
    message: r.message,
    status: r.status,
    reviewedAt: r.reviewedAt,
    createdAt: r.createdAt,
  };
}

function mockTeamTaskToDto(row: {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  status: TeamTaskStatus;
  sortOrder: number;
  milestoneId?: string;
  createdByUserId: string;
  assigneeUserId?: string;
  createdAt: string;
  updatedAt: string;
}): TeamTask {
  const assignee = row.assigneeUserId ? mockUsers.find((u) => u.id === row.assigneeUserId) : undefined;
  const ms = row.milestoneId
    ? mockTeamMilestones.find((m) => m.id === row.milestoneId && m.teamId === row.teamId)
    : undefined;
  return {
    id: row.id,
    teamId: row.teamId,
    title: row.title,
    description: row.description,
    status: row.status,
    sortOrder: row.sortOrder,
    milestoneId: row.milestoneId,
    milestoneTitle: ms?.title,
    createdByUserId: row.createdByUserId,
    createdByName: userNameById(row.createdByUserId),
    assigneeUserId: row.assigneeUserId,
    assigneeName: assignee?.name,
    assigneeEmail: assignee?.email,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function assertTaskMilestoneMock(teamId: string, milestoneId: string | null | undefined): void {
  if (milestoneId === undefined || milestoneId === null) {
    return;
  }
  const ok = mockTeamMilestones.some((m) => m.id === milestoneId && m.teamId === teamId);
  if (!ok) {
    throw new Error("TEAM_MILESTONE_NOT_FOUND");
  }
}

function nextTeamTaskSortOrderMock(teamId: string): number {
  const rows = mockTeamTasks.filter((t) => t.teamId === teamId);
  if (rows.length === 0) {
    return 0;
  }
  return Math.max(...rows.map((r) => r.sortOrder)) + 1;
}

async function assertTeamOwnerBySlug(teamSlug: string, userId: string): Promise<{ teamId: string }> {
  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === teamSlug);
    if (!team) {
      throw new Error("TEAM_NOT_FOUND");
    }
    if (team.ownerUserId !== userId) {
      throw new Error("FORBIDDEN_NOT_TEAM_OWNER");
    }
    return { teamId: team.id };
  }
  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
    select: { id: true, ownerUserId: true },
  });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }
  if (team.ownerUserId !== userId) {
    throw new Error("FORBIDDEN_NOT_TEAM_OWNER");
  }
  return { teamId: team.id };
}

async function assertTeamMemberBySlug(teamSlug: string, userId: string): Promise<{ teamId: string }> {
  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === teamSlug);
    if (!team) {
      throw new Error("TEAM_NOT_FOUND");
    }
    const ok = mockTeamMemberships.some((m) => m.teamId === team.id && m.userId === userId);
    if (!ok) {
      throw new Error("FORBIDDEN_NOT_TEAM_MEMBER");
    }
    return { teamId: team.id };
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
    select: { id: true },
  });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }
  const m = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId } },
  });
  if (!m) {
    throw new Error("FORBIDDEN_NOT_TEAM_MEMBER");
  }
  return { teamId: team.id };
}

async function assertTeamMemberRoleBySlug(
  teamSlug: string,
  userId: string
): Promise<{ teamId: string; role: TeamRole }> {
  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === teamSlug);
    if (!team) {
      throw new Error("TEAM_NOT_FOUND");
    }
    const m = mockTeamMemberships.find((x) => x.teamId === team.id && x.userId === userId);
    if (!m) {
      throw new Error("FORBIDDEN_NOT_TEAM_MEMBER");
    }
    return { teamId: team.id, role: m.role };
  }
  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
    select: { id: true },
  });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }
  const m = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId } },
    select: { role: true },
  });
  if (!m) {
    throw new Error("FORBIDDEN_NOT_TEAM_MEMBER");
  }
  return { teamId: team.id, role: m.role as TeamRole };
}

async function assertTeamTaskMutateAllowed(params: {
  teamSlug: string;
  actorUserId: string;
  taskId: string;
  op: "update" | "delete";
}): Promise<{ teamId: string }> {
  const { teamId, role } = await assertTeamMemberRoleBySlug(params.teamSlug, params.actorUserId);
  if (role === "owner") {
    return { teamId };
  }

  if (useMockData) {
    const row = mockTeamTasks.find((t) => t.id === params.taskId && t.teamId === teamId);
    if (!row) {
      throw new Error("TEAM_TASK_NOT_FOUND");
    }
    if (params.op === "delete") {
      if (row.createdByUserId !== params.actorUserId) {
        throw new Error("FORBIDDEN_TASK_DELETE");
      }
      return { teamId };
    }
    if (row.createdByUserId === params.actorUserId || row.assigneeUserId === params.actorUserId) {
      return { teamId };
    }
    throw new Error("FORBIDDEN_TASK_UPDATE");
  }

  const prisma = await getPrisma();
  const row = await prisma.teamTask.findFirst({
    where: { id: params.taskId, teamId },
    select: { createdByUserId: true, assigneeUserId: true },
  });
  if (!row) {
    throw new Error("TEAM_TASK_NOT_FOUND");
  }
  if (params.op === "delete") {
    if (row.createdByUserId !== params.actorUserId) {
      throw new Error("FORBIDDEN_TASK_DELETE");
    }
    return { teamId };
  }
  if (row.createdByUserId === params.actorUserId || row.assigneeUserId === params.actorUserId) {
    return { teamId };
  }
  throw new Error("FORBIDDEN_TASK_UPDATE");
}

function toInAppNotificationDto(row: {
  id: string;
  kind: InAppNotificationKind;
  title: string;
  body: string;
  readAt?: string | Date | null;
  metadata?: unknown;
  createdAt: string | Date;
}): InAppNotification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    readAt: row.readAt ? (typeof row.readAt === "string" ? row.readAt : row.readAt.toISOString()) : undefined,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : undefined,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
  };
}

async function createInAppNotificationDb(params: {
  userId: string;
  kind: InAppNotificationKind;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const prisma = await getPrisma();
  await prisma.inAppNotification.create({
    data: {
      userId: params.userId,
      kind: params.kind,
      title: params.title,
      body: params.body,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

/** P3-FE-4: map notification kinds to preference columns */
function notificationCategoryForKind(
  kind: InAppNotificationKind
): "commentReplies" | "teamUpdates" | "collaborationModeration" | "systemAnnouncements" {
  switch (kind) {
    case "post_commented":
    case "comment_replied":
    case "post_liked":
      return "commentReplies";
    case "team_join_request":
    case "team_join_approved":
    case "team_join_rejected":
    case "team_task_assigned":
      return "teamUpdates";
    case "collaboration_intent_status_update":
    case "project_intent_received":
      return "collaborationModeration";
    default:
      return "systemAnnouncements";
  }
}

async function shouldDeliverInAppNotification(
  userId: string,
  kind: InAppNotificationKind
): Promise<boolean> {
  if (useMockData) {
    return true;
  }
  const prisma = await getPrisma();
  const pref = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (!pref) {
    return true;
  }
  const key = notificationCategoryForKind(kind);
  return pref[key];
}

function pushMockNotification(params: {
  userId: string;
  kind: InAppNotificationKind;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}): void {
  const now = new Date().toISOString();
  const id = `n_${params.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  mockInAppNotifications.unshift({
    id,
    userId: params.userId,
    kind: params.kind,
    title: params.title,
    body: params.body,
    metadata: params.metadata,
    createdAt: now,
  });
}

async function notifyUser(params: {
  userId: string;
  kind: InAppNotificationKind;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const deliver = await shouldDeliverInAppNotification(params.userId, params.kind);
  if (!deliver) {
    return;
  }
  if (useMockData) {
    pushMockNotification(params);
    const u = mockUsers.find((x) => x.id === params.userId);
    if (u) {
      void dispatchNotificationPush({
        userId: params.userId,
        userEmail: u.email,
        kind: params.kind,
        title: params.title,
        body: params.body,
        metadata: params.metadata,
      });
    }
    void dispatchWebhookEvent(params.userId, "in_app_notification", {
      kind: params.kind,
      title: params.title,
      body: params.body,
      metadata: params.metadata ?? null,
    });
    return;
  }
  await createInAppNotificationDb(params);
  const prisma = await getPrisma();
  const u = await prisma.user.findUnique({ where: { id: params.userId }, select: { email: true } });
  if (u?.email) {
    void dispatchNotificationPush({
      userId: params.userId,
      userEmail: u.email,
      kind: params.kind,
      title: params.title,
      body: params.body,
      metadata: params.metadata,
    });
  }
  void dispatchWebhookEvent(params.userId, "in_app_notification", {
    kind: params.kind,
    title: params.title,
    body: params.body,
    metadata: params.metadata ?? null,
  });
}

/** Best-effort MCP v2 invoke audit (no-op in mock mode). */
export async function logMcpInvoke(params: {
  tool: string;
  userId: string;
  apiKeyId?: string;
  httpStatus: number;
  clientIp?: string | null;
  userAgent?: string | null;
  errorCode?: string | null;
  durationMs?: number;
}): Promise<void> {
  if (useMockData) {
    return;
  }
  try {
    const prisma = await getPrisma();
    await prisma.mcpInvokeAudit.create({
      data: {
        tool: params.tool,
        userId: params.userId,
        apiKeyId: params.apiKeyId ?? null,
        httpStatus: params.httpStatus,
        clientIp: params.clientIp ?? null,
        userAgent: params.userAgent ?? null,
        errorCode: params.errorCode ?? null,
        durationMs: params.durationMs ?? null,
      },
    });
  } catch {
    /* never break invoke */
  }
}

/** P2-2: returns false if this idempotency key was already used for the user+tool. */
const mcpIdempotencyMockKeys = new Set<string>();

export async function tryRegisterMcpInvokeIdempotency(params: {
  userId: string;
  tool: string;
  key: string;
}): Promise<boolean> {
  if (useMockData) {
    const k = `${params.userId}::${params.tool}::${params.key}`;
    if (mcpIdempotencyMockKeys.has(k)) return false;
    mcpIdempotencyMockKeys.add(k);
    return true;
  }
  try {
    const prisma = await getPrisma();
    await prisma.mcpInvokeIdempotency.create({
      data: { userId: params.userId, tool: params.tool, key: params.key },
    });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return false;
    }
    throw e;
  }
}

export async function listMcpInvokeAudits(params: {
  page: number;
  limit: number;
}): Promise<{ items: McpInvokeAuditRow[]; total: number }> {
  if (useMockData) {
    return { items: [], total: 0 };
  }
  const prisma = await getPrisma();
  const take = Math.min(Math.max(params.limit, 1), 100);
  const skip = (Math.max(params.page, 1) - 1) * take;
  const [rows, total] = await Promise.all([
    prisma.mcpInvokeAudit.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.mcpInvokeAudit.count(),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      tool: r.tool,
      userId: r.userId,
      apiKeyId: r.apiKeyId ?? undefined,
      httpStatus: r.httpStatus,
      clientIp: r.clientIp ?? undefined,
      userAgent: r.userAgent ?? undefined,
      errorCode: r.errorCode ?? undefined,
      durationMs: r.durationMs ?? undefined,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
  };
}

export async function listInAppNotifications(params: {
  userId: string;
  unreadOnly?: boolean;
  limit?: number;
}): Promise<InAppNotification[]> {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
  if (useMockData) {
    let rows = mockInAppNotifications.filter((n) => n.userId === params.userId);
    if (params.unreadOnly) {
      rows = rows.filter((n) => !n.readAt);
    }
    return rows
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((n) =>
        toInAppNotificationDto({
          id: n.id,
          kind: n.kind,
          title: n.title,
          body: n.body,
          readAt: n.readAt,
          metadata: n.metadata,
          createdAt: n.createdAt,
        })
      );
  }
  const prisma = await getPrisma();
  const rows = await prisma.inAppNotification.findMany({
    where: {
      userId: params.userId,
      ...(params.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) =>
    toInAppNotificationDto({
      id: r.id,
      kind: r.kind as InAppNotificationKind,
      title: r.title,
      body: r.body,
      readAt: r.readAt,
      metadata: r.metadata,
      createdAt: r.createdAt,
    })
  );
}

export interface NotificationPreferenceDto {
  commentReplies: boolean;
  teamUpdates: boolean;
  collaborationModeration: boolean;
  systemAnnouncements: boolean;
}

const mockNotificationPreferenceByUser = new Map<string, NotificationPreferenceDto>();

export async function getNotificationPreference(userId: string): Promise<NotificationPreferenceDto> {
  const defaults: NotificationPreferenceDto = {
    commentReplies: true,
    teamUpdates: true,
    collaborationModeration: true,
    systemAnnouncements: true,
  };
  if (useMockData) {
    return { ...defaults, ...mockNotificationPreferenceByUser.get(userId) };
  }
  const prisma = await getPrisma();
  const row = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (!row) return defaults;
  return {
    commentReplies: row.commentReplies,
    teamUpdates: row.teamUpdates,
    collaborationModeration: row.collaborationModeration,
    systemAnnouncements: row.systemAnnouncements,
  };
}

export async function upsertNotificationPreference(
  userId: string,
  patch: Partial<NotificationPreferenceDto>
): Promise<NotificationPreferenceDto> {
  const next: NotificationPreferenceDto = {
    ...(await getNotificationPreference(userId)),
    ...patch,
  };
  if (useMockData) {
    mockNotificationPreferenceByUser.set(userId, next);
    return next;
  }
  const prisma = await getPrisma();
  const row = await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      commentReplies: next.commentReplies,
      teamUpdates: next.teamUpdates,
      collaborationModeration: next.collaborationModeration,
      systemAnnouncements: next.systemAnnouncements,
    },
    update: {
      commentReplies: next.commentReplies,
      teamUpdates: next.teamUpdates,
      collaborationModeration: next.collaborationModeration,
      systemAnnouncements: next.systemAnnouncements,
    },
  });
  return {
    commentReplies: row.commentReplies,
    teamUpdates: row.teamUpdates,
    collaborationModeration: row.collaborationModeration,
    systemAnnouncements: row.systemAnnouncements,
  };
}

export async function countUnreadInAppNotifications(userId: string): Promise<number> {
  if (useMockData) {
    return mockInAppNotifications.filter((n) => n.userId === userId && !n.readAt).length;
  }
  const prisma = await getPrisma();
  return prisma.inAppNotification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

export async function markInAppNotificationsRead(params: {
  userId: string;
  ids?: string[];
  markAll?: boolean;
}): Promise<{ updated: number }> {
  if (useMockData) {
    let n = 0;
    if (params.markAll) {
      for (const row of mockInAppNotifications) {
        if (row.userId === params.userId && !row.readAt) {
          row.readAt = new Date().toISOString();
          n += 1;
        }
      }
      return { updated: n };
    }
    const idSet = new Set(params.ids ?? []);
    for (const row of mockInAppNotifications) {
      if (row.userId === params.userId && idSet.has(row.id) && !row.readAt) {
        row.readAt = new Date().toISOString();
        n += 1;
      }
    }
    return { updated: n };
  }
  const prisma = await getPrisma();
  if (params.markAll) {
    const res = await prisma.inAppNotification.updateMany({
      where: { userId: params.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: res.count };
  }
  if (!params.ids?.length) {
    return { updated: 0 };
  }
  const res = await prisma.inAppNotification.updateMany({
    where: { userId: params.userId, id: { in: params.ids }, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}

export async function listPendingJoinRequestsForOwner(params: {
  ownerUserId: string;
}): Promise<Array<TeamJoinRequestRow & { teamSlug: string; teamName: string }>> {
  return listPendingJoinRequestsForOwnerFromShared({
    useMockData,
    getPrisma,
    ownerUserId: params.ownerUserId,
    mockTeams,
    mockTeamJoinRequests,
    mockUsers,
  });
}

export async function listTeamTasks(params: { teamSlug: string; viewerUserId: string }): Promise<TeamTask[]> {
  await assertTeamMemberBySlug(params.teamSlug, params.viewerUserId);

  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug)!;
    return mockTeamTasks
      .filter((t) => t.teamId === team.id)
      .map(mockTeamTaskToDto)
      .sort((a, b) => a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt));
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({ where: { slug: params.teamSlug }, select: { id: true } });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }
  const rows = await prisma.teamTask.findMany({
    where: { teamId: team.id },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: {
      createdBy: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      milestone: { select: { id: true, title: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    teamId: r.teamId,
    title: r.title,
    description: r.description ?? undefined,
    status: r.status as TeamTaskStatus,
    sortOrder: r.sortOrder,
    milestoneId: r.milestoneId ?? undefined,
    milestoneTitle: r.milestone?.title,
    createdByUserId: r.createdByUserId,
    createdByName: r.createdBy.name,
    assigneeUserId: r.assignee?.id,
    assigneeName: r.assignee?.name,
    assigneeEmail: r.assignee?.email,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getTeamTaskByIdForSlug(params: {
  teamSlug: string;
  taskId: string;
  viewerUserId: string;
}): Promise<TeamTask | null> {
  await assertTeamMemberBySlug(params.teamSlug, params.viewerUserId);

  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) return null;
    const row = mockTeamTasks.find((t) => t.id === params.taskId && t.teamId === team.id);
    return row ? mockTeamTaskToDto(row) : null;
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({ where: { slug: params.teamSlug }, select: { id: true } });
  if (!team) return null;
  const r = await prisma.teamTask.findFirst({
    where: { id: params.taskId, teamId: team.id },
    include: {
      createdBy: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      milestone: { select: { id: true, title: true } },
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    teamId: r.teamId,
    title: r.title,
    description: r.description ?? undefined,
    status: r.status as TeamTaskStatus,
    sortOrder: r.sortOrder,
    milestoneId: r.milestoneId ?? undefined,
    milestoneTitle: r.milestone?.title,
    createdByUserId: r.createdByUserId,
    createdByName: r.createdBy.name,
    assigneeUserId: r.assignee?.id,
    assigneeName: r.assignee?.name,
    assigneeEmail: r.assignee?.email,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function createTeamTask(params: {
  teamSlug: string;
  actorUserId: string;
  title: string;
  description?: string;
  status?: TeamTaskStatus;
  assigneeUserId?: string;
  sortOrder?: number;
  milestoneId?: string | null;
}): Promise<TeamTask> {
  const { teamId } = await assertTeamMemberBySlug(params.teamSlug, params.actorUserId);
  const teamSlug = params.teamSlug;
  const title = params.title.trim();
  if (!title) {
    throw new Error("INVALID_TASK_TITLE");
  }
  const status: TeamTaskStatus =
    params.status && ["todo", "doing", "done"].includes(params.status) ? params.status : "todo";
  const desc = params.description?.trim().slice(0, 2000) || undefined;

  if (useMockData) {
    if (params.assigneeUserId) {
      const assigneeMember = mockTeamMemberships.some(
        (m) => m.teamId === teamId && m.userId === params.assigneeUserId
      );
      if (!assigneeMember) {
        throw new Error("ASSIGNEE_NOT_TEAM_MEMBER");
      }
    }
    assertTaskMilestoneMock(teamId, params.milestoneId);
    const now = new Date().toISOString();
    const sortOrder =
      params.sortOrder !== undefined && Number.isFinite(params.sortOrder)
        ? Math.floor(params.sortOrder)
        : nextTeamTaskSortOrderMock(teamId);
    const row = {
      id: `tt_${teamId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      teamId,
      title,
      description: desc,
      status,
      sortOrder,
      milestoneId: params.milestoneId === null || params.milestoneId === undefined ? undefined : params.milestoneId,
      createdByUserId: params.actorUserId,
      assigneeUserId: params.assigneeUserId,
      createdAt: now,
      updatedAt: now,
    };
    mockTeamTasks.unshift(row);
    mockAuditLogs.unshift({
      id: `log_tt_${Date.now()}`,
      actorId: params.actorUserId,
      action: "team_task_created",
      entityType: "team_task",
      entityId: row.id,
      metadata: { teamId },
      createdAt: now,
    });
    const dto = mockTeamTaskToDto(row);
    if (params.assigneeUserId && params.assigneeUserId !== params.actorUserId) {
      void notifyUser({
        userId: params.assigneeUserId,
        kind: "team_task_assigned",
        title: "你被分配到团队任务",
        body: `${userNameById(params.actorUserId)} 在团队 /${teamSlug} 将任务「${title}」分配给你。`,
        metadata: { teamSlug, taskId: row.id },
      });
    }
    return dto;
  }

  const prisma = await getPrisma();
  if (params.assigneeUserId) {
    const mem = await prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId, userId: params.assigneeUserId } },
    });
    if (!mem) {
      throw new Error("ASSIGNEE_NOT_TEAM_MEMBER");
    }
  }

  let milestoneId: string | null = null;
  if (params.milestoneId !== undefined && params.milestoneId !== null) {
    const ms = await prisma.teamMilestone.findFirst({
      where: { id: params.milestoneId, teamId },
      select: { id: true },
    });
    if (!ms) {
      throw new Error("TEAM_MILESTONE_NOT_FOUND");
    }
    milestoneId = ms.id;
  } else if (params.milestoneId === null) {
    milestoneId = null;
  }

  let sortOrder: number;
  if (params.sortOrder !== undefined && Number.isFinite(params.sortOrder)) {
    sortOrder = Math.floor(params.sortOrder);
  } else {
    const agg = await prisma.teamTask.aggregate({
      where: { teamId },
      _max: { sortOrder: true },
    });
    sortOrder = agg._max.sortOrder != null ? agg._max.sortOrder + 1 : 0;
  }

  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const t = await tx.teamTask.create({
      data: {
        teamId,
        title,
        description: desc ?? null,
        status,
        sortOrder,
        milestoneId,
        createdByUserId: params.actorUserId,
        assigneeUserId: params.assigneeUserId ?? null,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        milestone: { select: { id: true, title: true } },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.actorUserId,
        action: "team_task_created",
        entityType: "team_task",
        entityId: t.id,
        metadata: { teamId },
      },
    });
    return t;
  });

  if (params.assigneeUserId && params.assigneeUserId !== params.actorUserId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { slug: true },
    });
    const slug = team?.slug ?? teamSlug;
    void notifyUser({
      userId: params.assigneeUserId,
      kind: "team_task_assigned",
      title: "你被分配到团队任务",
      body: `在团队 /${slug} 有新任务「${title}」分配给你。`,
      metadata: { teamSlug: slug, taskId: created.id },
    });
  }

  return {
    id: created.id,
    teamId: created.teamId,
    title: created.title,
    description: created.description ?? undefined,
    status: created.status as TeamTaskStatus,
    sortOrder: created.sortOrder,
    milestoneId: created.milestoneId ?? undefined,
    milestoneTitle: created.milestone?.title,
    createdByUserId: created.createdByUserId,
    createdByName: created.createdBy.name,
    assigneeUserId: created.assignee?.id,
    assigneeName: created.assignee?.name,
    assigneeEmail: created.assignee?.email,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function reorderTeamTask(params: {
  teamSlug: string;
  taskId: string;
  actorUserId: string;
  direction: "up" | "down";
}): Promise<TeamTask[]> {
  const { teamId } = await assertTeamTaskMutateAllowed({
    teamSlug: params.teamSlug,
    actorUserId: params.actorUserId,
    taskId: params.taskId,
    op: "update",
  });

  if (useMockData) {
    const row = mockTeamTasks.find((t) => t.id === params.taskId && t.teamId === teamId);
    if (!row) {
      throw new Error("TEAM_TASK_NOT_FOUND");
    }
    const ordered = mockTeamTasks
      .filter((t) => t.teamId === teamId && t.status === row.status)
      .sort((a, b) => a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt));
    const idx = ordered.findIndex((t) => t.id === params.taskId);
    if (idx < 0) {
      throw new Error("TEAM_TASK_NOT_FOUND");
    }
    const j = params.direction === "up" ? idx - 1 : idx + 1;
    if (j < 0 || j >= ordered.length) {
      throw new Error("TEAM_TASK_REORDER_EDGE");
    }
    const a = ordered[idx];
    const b = ordered[j];
    const tmp = a.sortOrder;
    a.sortOrder = b.sortOrder;
    b.sortOrder = tmp;
    const now = new Date().toISOString();
    a.updatedAt = now;
    b.updatedAt = now;
    return listTeamTasks({ teamSlug: params.teamSlug, viewerUserId: params.actorUserId });
  }

  const prisma = await getPrisma();
  const self = await prisma.teamTask.findFirst({
    where: { id: params.taskId, teamId },
    select: { status: true },
  });
  if (!self) {
    throw new Error("TEAM_TASK_NOT_FOUND");
  }
  const tasks = await prisma.teamTask.findMany({
    where: { teamId, status: self.status },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
  const idx = tasks.findIndex((t) => t.id === params.taskId);
  if (idx < 0) {
    throw new Error("TEAM_TASK_NOT_FOUND");
  }
  const j = params.direction === "up" ? idx - 1 : idx + 1;
  if (j < 0 || j >= tasks.length) {
    throw new Error("TEAM_TASK_REORDER_EDGE");
  }
  const a = tasks[idx];
  const b = tasks[j];
  const orderA = a.sortOrder;
  const orderB = b.sortOrder;
  await prisma.$transaction([
    prisma.teamTask.update({
      where: { id: a.id },
      data: { sortOrder: orderB, updatedAt: new Date() },
    }),
    prisma.teamTask.update({
      where: { id: b.id },
      data: { sortOrder: orderA, updatedAt: new Date() },
    }),
  ]);

  return listTeamTasks({ teamSlug: params.teamSlug, viewerUserId: params.actorUserId });
}

export async function updateTeamTask(params: {
  teamSlug: string;
  taskId: string;
  actorUserId: string;
  title?: string;
  description?: string | null;
  status?: TeamTaskStatus;
  assigneeUserId?: string | null;
  sortOrder?: number;
  milestoneId?: string | null;
}): Promise<TeamTask> {
  const { teamId } = await assertTeamTaskMutateAllowed({
    teamSlug: params.teamSlug,
    actorUserId: params.actorUserId,
    taskId: params.taskId,
    op: "update",
  });

  if (useMockData) {
    const idx = mockTeamTasks.findIndex((t) => t.id === params.taskId && t.teamId === teamId);
    if (idx < 0) {
      throw new Error("TEAM_TASK_NOT_FOUND");
    }
    const cur = mockTeamTasks[idx];
    const prevStatus = cur.status;
    if (params.title !== undefined) {
      const t = params.title.trim();
      if (!t) {
        throw new Error("INVALID_TASK_TITLE");
      }
      cur.title = t;
    }
    if (params.description !== undefined) {
      cur.description = params.description === null ? undefined : params.description.trim().slice(0, 2000);
    }
    if (params.status !== undefined) {
      if (!["todo", "doing", "done"].includes(params.status)) {
        throw new Error("INVALID_TASK_STATUS");
      }
      cur.status = params.status;
    }
    if (params.assigneeUserId !== undefined) {
      if (params.assigneeUserId === null) {
        cur.assigneeUserId = undefined;
      } else {
        const ok = mockTeamMemberships.some(
          (m) => m.teamId === teamId && m.userId === params.assigneeUserId
        );
        if (!ok) {
          throw new Error("ASSIGNEE_NOT_TEAM_MEMBER");
        }
        const prevAssignee = cur.assigneeUserId;
        cur.assigneeUserId = params.assigneeUserId;
        if (params.assigneeUserId !== params.actorUserId && params.assigneeUserId !== prevAssignee) {
          const team = mockTeams.find((t) => t.id === teamId);
          void notifyUser({
            userId: params.assigneeUserId,
            kind: "team_task_assigned",
            title: "你被分配到团队任务",
            body: `${userNameById(params.actorUserId)} 在团队 /${team?.slug ?? ""} 将「${cur.title}」分配给你。`,
            metadata: { teamSlug: team?.slug, taskId: cur.id },
          });
        }
      }
    }
    if (params.sortOrder !== undefined && Number.isFinite(params.sortOrder)) {
      cur.sortOrder = Math.floor(params.sortOrder);
    }
    if (params.milestoneId !== undefined) {
      assertTaskMilestoneMock(teamId, params.milestoneId);
      cur.milestoneId = params.milestoneId === null ? undefined : params.milestoneId;
    }
    cur.updatedAt = new Date().toISOString();
    if (params.status === "done" && prevStatus !== "done") {
      const creditedUserId = cur.assigneeUserId ?? cur.createdByUserId;
      void incrementContributionCreditField({
        userId: creditedUserId,
        useMockData: true,
        deltaScore: contributionWeights.taskDone,
        field: "tasksCompleted",
      });
    }
    return mockTeamTaskToDto(cur);
  }

  const prisma = await getPrisma();
  const existing = await prisma.teamTask.findFirst({
    where: { id: params.taskId, teamId },
  });
  if (!existing) {
    throw new Error("TEAM_TASK_NOT_FOUND");
  }
  const prevTaskStatus = existing.status;

  if (params.assigneeUserId !== undefined && params.assigneeUserId !== null) {
    const mem = await prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId, userId: params.assigneeUserId } },
    });
    if (!mem) {
      throw new Error("ASSIGNEE_NOT_TEAM_MEMBER");
    }
  }

  if (params.milestoneId !== undefined && params.milestoneId !== null) {
    const ms = await prisma.teamMilestone.findFirst({
      where: { id: params.milestoneId, teamId },
      select: { id: true },
    });
    if (!ms) {
      throw new Error("TEAM_MILESTONE_NOT_FOUND");
    }
  }

  const data: {
    title?: string;
    description?: string | null;
    status?: "todo" | "doing" | "done";
    assigneeUserId?: string | null;
    sortOrder?: number;
    milestoneId?: string | null;
  } = {};
  if (params.title !== undefined) {
    const t = params.title.trim();
    if (!t) {
      throw new Error("INVALID_TASK_TITLE");
    }
    data.title = t;
  }
  if (params.description !== undefined) {
    data.description = params.description === null ? null : params.description.trim().slice(0, 2000) || null;
  }
  if (params.status !== undefined) {
    if (!["todo", "doing", "done"].includes(params.status)) {
      throw new Error("INVALID_TASK_STATUS");
    }
    data.status = params.status;
  }
  if (params.assigneeUserId !== undefined) {
    data.assigneeUserId = params.assigneeUserId;
  }
  if (params.sortOrder !== undefined && Number.isFinite(params.sortOrder)) {
    data.sortOrder = Math.floor(params.sortOrder);
  }
  if (params.milestoneId !== undefined) {
    data.milestoneId = params.milestoneId;
  }

  const prevAssignee = existing.assigneeUserId;
  const updated = await prisma.teamTask.update({
    where: { id: params.taskId },
    data,
    include: {
      createdBy: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      milestone: { select: { id: true, title: true } },
    },
  });
  if (
    params.assigneeUserId !== undefined &&
    params.assigneeUserId !== null &&
    params.assigneeUserId !== params.actorUserId &&
    params.assigneeUserId !== prevAssignee
  ) {
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { slug: true } });
    void notifyUser({
      userId: params.assigneeUserId,
      kind: "team_task_assigned",
      title: "你被分配到团队任务",
      body: `在团队 /${team?.slug ?? params.teamSlug} 的任务「${updated.title}」已分配给你。`,
      metadata: { teamSlug: team?.slug ?? params.teamSlug, taskId: updated.id },
    });
  }
  if (data.status === "done" && prevTaskStatus !== "done") {
    const creditedUserId = updated.assignee?.id ?? updated.createdByUserId;
    void incrementContributionCreditField({
      userId: creditedUserId,
      useMockData: false,
      deltaScore: contributionWeights.taskDone,
      field: "tasksCompleted",
    });
  }
  return {
    id: updated.id,
    teamId: updated.teamId,
    title: updated.title,
    description: updated.description ?? undefined,
    status: updated.status as TeamTaskStatus,
    sortOrder: updated.sortOrder,
    milestoneId: updated.milestoneId ?? undefined,
    milestoneTitle: updated.milestone?.title,
    createdByUserId: updated.createdByUserId,
    createdByName: updated.createdBy.name,
    assigneeUserId: updated.assignee?.id,
    assigneeName: updated.assignee?.name,
    assigneeEmail: updated.assignee?.email,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

/** Bulk status update for Kanban (team owner only). */
export async function batchUpdateTeamTasks(params: {
  teamSlug: string;
  actorUserId: string;
  taskIds: string[];
  status: TeamTaskStatus;
}): Promise<TeamTask[]> {
  const { teamId, role } = await assertTeamMemberRoleBySlug(params.teamSlug, params.actorUserId);
  if (role !== "owner") {
    throw new Error("FORBIDDEN_BATCH_TASK_UPDATE");
  }
  if (!["todo", "doing", "done"].includes(params.status)) {
    throw new Error("INVALID_TASK_STATUS");
  }
  const ids = [...new Set(params.taskIds.filter(Boolean))];
  if (ids.length === 0) {
    return [];
  }

  if (useMockData) {
    const now = new Date().toISOString();
    const out: TeamTask[] = [];
    for (const id of ids) {
      const idx = mockTeamTasks.findIndex((t) => t.id === id && t.teamId === teamId);
      if (idx < 0) continue;
      mockTeamTasks[idx].status = params.status;
      mockTeamTasks[idx].updatedAt = now;
      out.push(mockTeamTaskToDto(mockTeamTasks[idx]));
    }
    return out;
  }

  const prisma = await getPrisma();
  await prisma.teamTask.updateMany({
    where: { teamId, id: { in: ids } },
    data: { status: params.status },
  });
  const rows = await prisma.teamTask.findMany({
    where: { teamId, id: { in: ids } },
    include: {
      createdBy: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      milestone: { select: { id: true, title: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map((updated) => ({
    id: updated.id,
    teamId: updated.teamId,
    title: updated.title,
    description: updated.description ?? undefined,
    status: updated.status as TeamTaskStatus,
    sortOrder: updated.sortOrder,
    milestoneId: updated.milestoneId ?? undefined,
    milestoneTitle: updated.milestone?.title,
    createdByUserId: updated.createdByUserId,
    createdByName: updated.createdBy.name,
    assigneeUserId: updated.assignee?.id,
    assigneeName: updated.assignee?.name,
    assigneeEmail: updated.assignee?.email,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  }));
}

export async function deleteTeamTask(params: {
  teamSlug: string;
  taskId: string;
  actorUserId: string;
}): Promise<void> {
  const { teamId } = await assertTeamTaskMutateAllowed({
    teamSlug: params.teamSlug,
    actorUserId: params.actorUserId,
    taskId: params.taskId,
    op: "delete",
  });

  if (useMockData) {
    const idx = mockTeamTasks.findIndex((t) => t.id === params.taskId && t.teamId === teamId);
    if (idx < 0) {
      throw new Error("TEAM_TASK_NOT_FOUND");
    }
    mockTeamTasks.splice(idx, 1);
    return;
  }

  const prisma = await getPrisma();
  const del = await prisma.teamTask.deleteMany({
    where: { id: params.taskId, teamId },
  });
  if (del.count === 0) {
    throw new Error("TEAM_TASK_NOT_FOUND");
  }
}

function mockTeamMilestoneToDto(row: {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  targetDate: string;
  completed: boolean;
  sortOrder: number;
  visibility?: "team_only" | "public";
  progress?: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}): TeamMilestone {
  return {
    id: row.id,
    teamId: row.teamId,
    title: row.title,
    description: row.description,
    targetDate: row.targetDate,
    completed: row.completed,
    sortOrder: row.sortOrder,
    visibility: row.visibility ?? "team_only",
    progress: row.progress ?? 0,
    createdByUserId: row.createdByUserId,
    createdByName: userNameById(row.createdByUserId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function nextMilestoneSortOrder(teamId: string): number {
  const rows = mockTeamMilestones.filter((m) => m.teamId === teamId);
  if (rows.length === 0) {
    return 0;
  }
  return Math.max(...rows.map((m) => m.sortOrder)) + 1;
}

export async function listTeamMilestones(params: { teamSlug: string; viewerUserId: string }): Promise<TeamMilestone[]> {
  await assertTeamMemberBySlug(params.teamSlug, params.viewerUserId);

  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug)!;
    return mockTeamMilestones
      .filter((m) => m.teamId === team.id)
      .map(mockTeamMilestoneToDto)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.targetDate.localeCompare(b.targetDate));
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({ where: { slug: params.teamSlug }, select: { id: true } });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }
  const rows = await prisma.teamMilestone.findMany({
    where: { teamId: team.id },
    orderBy: [{ sortOrder: "asc" }, { targetDate: "asc" }],
    include: { createdBy: { select: { id: true, name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    teamId: r.teamId,
    title: r.title,
    description: r.description ?? undefined,
    targetDate: r.targetDate.toISOString(),
    completed: r.completed,
    sortOrder: r.sortOrder,
    visibility: (r.visibility === "public" ? "public" : "team_only") as "team_only" | "public",
    progress: r.progress,
    createdByUserId: r.createdByUserId,
    createdByName: r.createdBy.name,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function listPublicMilestonesForProject(projectId: string): Promise<TeamMilestone[]> {
  if (useMockData) {
    // Find team linked to this project
    const project = mockProjects.find((p) => p.id === projectId);
    if (!project?.teamId) return [];
    return mockTeamMilestones
      .filter((m) => m.teamId === project.teamId && m.visibility === "public")
      .map(mockTeamMilestoneToDto)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  const prisma = await getPrisma();
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { teamId: true } });
  if (!project?.teamId) return [];
  const rows = await prisma.teamMilestone.findMany({
    where: { teamId: project.teamId, visibility: "public" },
    orderBy: [{ sortOrder: "asc" }],
    include: { createdBy: { select: { id: true, name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    teamId: r.teamId,
    title: r.title,
    description: r.description ?? undefined,
    targetDate: r.targetDate.toISOString(),
    completed: r.completed,
    sortOrder: r.sortOrder,
    visibility: "public" as const,
    progress: r.progress,
    createdByUserId: r.createdByUserId,
    createdByName: r.createdBy.name,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function createTeamMilestone(params: {
  teamSlug: string;
  actorUserId: string;
  title: string;
  description?: string;
  targetDate: string;
  sortOrder?: number;
}): Promise<TeamMilestone> {
  const { teamId } = await assertTeamOwnerBySlug(params.teamSlug, params.actorUserId);
  const title = params.title.trim();
  if (!title) {
    throw new Error("INVALID_MILESTONE_TITLE");
  }
  const target = new Date(params.targetDate);
  if (Number.isNaN(target.getTime())) {
    throw new Error("INVALID_MILESTONE_DATE");
  }
  const desc = params.description?.trim().slice(0, 2000) || undefined;

  if (useMockData) {
    const now = new Date().toISOString();
    const sortOrder =
      params.sortOrder !== undefined && Number.isFinite(params.sortOrder)
        ? Math.floor(params.sortOrder)
        : nextMilestoneSortOrder(teamId);
    const row = {
      id: `ms_${teamId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      teamId,
      title,
      description: desc,
      targetDate: target.toISOString(),
      completed: false,
      sortOrder,
      visibility: "team_only" as const,
      progress: 0,
      createdByUserId: params.actorUserId,
      createdAt: now,
      updatedAt: now,
    };
    mockTeamMilestones.push(row);
    mockAuditLogs.unshift({
      id: `log_ms_${Date.now()}`,
      actorId: params.actorUserId,
      action: "team_milestone_created",
      entityType: "team_milestone",
      entityId: row.id,
      metadata: { teamId },
      createdAt: now,
    });
    return mockTeamMilestoneToDto(row);
  }

  const prisma = await getPrisma();
  let sortOrder: number;
  if (params.sortOrder !== undefined && Number.isFinite(params.sortOrder)) {
    sortOrder = Math.floor(params.sortOrder);
  } else {
    const agg = await prisma.teamMilestone.aggregate({
      where: { teamId },
      _max: { sortOrder: true },
    });
    sortOrder = agg._max.sortOrder != null ? agg._max.sortOrder + 1 : 0;
  }

  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const m = await tx.teamMilestone.create({
      data: {
        teamId,
        title,
        description: desc ?? null,
        targetDate: target,
        completed: false,
        sortOrder,
        createdByUserId: params.actorUserId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.actorUserId,
        action: "team_milestone_created",
        entityType: "team_milestone",
        entityId: m.id,
        metadata: { teamId },
      },
    });
    return m;
  });

  return {
    id: created.id,
    teamId: created.teamId,
    title: created.title,
    description: created.description ?? undefined,
    targetDate: created.targetDate.toISOString(),
    completed: created.completed,
    sortOrder: created.sortOrder,
    visibility: (created.visibility === "public" ? "public" : "team_only") as "team_only" | "public",
    progress: created.progress,
    createdByUserId: created.createdByUserId,
    createdByName: created.createdBy.name,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function updateTeamMilestone(params: {
  teamSlug: string;
  milestoneId: string;
  actorUserId: string;
  title?: string;
  description?: string | null;
  targetDate?: string;
  completed?: boolean;
  sortOrder?: number;
  visibility?: "team_only" | "public";
  progress?: number;
}): Promise<TeamMilestone> {
  const { teamId, role } = await assertTeamMemberRoleBySlug(params.teamSlug, params.actorUserId);
  // P1-4: owner can edit all fields; non-owner members can only update progress.
  const wantsStructural =
    params.title !== undefined ||
    params.description !== undefined ||
    params.targetDate !== undefined ||
    params.sortOrder !== undefined ||
    params.visibility !== undefined ||
    params.completed !== undefined;

  if (useMockData) {
    const idx = mockTeamMilestones.findIndex((m) => m.id === params.milestoneId && m.teamId === teamId);
    if (idx < 0) {
      throw new Error("TEAM_MILESTONE_NOT_FOUND");
    }
    const cur = mockTeamMilestones[idx];
    const wasCompletedMock = cur.completed;
    const team = mockTeams.find((t) => t.id === teamId);
    const isOwner = team?.ownerUserId === params.actorUserId || role === "owner";
    if (!isOwner) {
      if (wantsStructural || params.progress === undefined) {
        throw new Error("FORBIDDEN_MILESTONE_MEMBER_EDIT");
      }
    }
    if (params.title !== undefined) {
      const t = params.title.trim();
      if (!t) {
        throw new Error("INVALID_MILESTONE_TITLE");
      }
      cur.title = t;
    }
    if (params.description !== undefined) {
      cur.description =
        params.description === null ? undefined : params.description.trim().slice(0, 2000) || undefined;
    }
    if (params.targetDate !== undefined) {
      const d = new Date(params.targetDate);
      if (Number.isNaN(d.getTime())) {
        throw new Error("INVALID_MILESTONE_DATE");
      }
      cur.targetDate = d.toISOString();
    }
    if (params.completed !== undefined) {
      cur.completed = params.completed;
    }
    if (params.sortOrder !== undefined && Number.isFinite(params.sortOrder)) {
      cur.sortOrder = Math.floor(params.sortOrder);
    }
    if (params.visibility !== undefined) {
      cur.visibility = params.visibility;
    }
    if (params.progress !== undefined && Number.isFinite(params.progress)) {
      cur.progress = Math.max(0, Math.min(100, Math.floor(params.progress)));
    }
    cur.updatedAt = new Date().toISOString();
    if (params.completed === true && !wasCompletedMock) {
      void incrementContributionCreditField({
        userId: cur.createdByUserId,
        useMockData: true,
        deltaScore: contributionWeights.milestoneCompleted,
        field: "milestonesHit",
      });
    }
    return mockTeamMilestoneToDto(cur);
  }

  const prisma = await getPrisma();
  const existing = await prisma.teamMilestone.findFirst({
    where: { id: params.milestoneId, teamId },
    include: { team: { select: { ownerUserId: true } } },
  });
  if (!existing) {
    throw new Error("TEAM_MILESTONE_NOT_FOUND");
  }
  const wasCompletedPrisma = existing.completed;
  const isOwner = existing.team.ownerUserId === params.actorUserId || role === "owner";
  if (!isOwner) {
    if (wantsStructural || params.progress === undefined) {
      throw new Error("FORBIDDEN_MILESTONE_MEMBER_EDIT");
    }
  }

  const data: {
    title?: string;
    description?: string | null;
    targetDate?: Date;
    completed?: boolean;
    sortOrder?: number;
    visibility?: string;
    progress?: number;
  } = {};
  if (params.title !== undefined) {
    const t = params.title.trim();
    if (!t) {
      throw new Error("INVALID_MILESTONE_TITLE");
    }
    data.title = t;
  }
  if (params.description !== undefined) {
    data.description = params.description === null ? null : params.description.trim().slice(0, 2000) || null;
  }
  if (params.targetDate !== undefined) {
    const d = new Date(params.targetDate);
    if (Number.isNaN(d.getTime())) {
      throw new Error("INVALID_MILESTONE_DATE");
    }
    data.targetDate = d;
  }
  if (params.completed !== undefined) {
    data.completed = params.completed;
  }
  if (params.sortOrder !== undefined && Number.isFinite(params.sortOrder)) {
    data.sortOrder = Math.floor(params.sortOrder);
  }
  if (params.visibility !== undefined) {
    data.visibility = params.visibility;
  }
  if (params.progress !== undefined && Number.isFinite(params.progress)) {
    data.progress = Math.max(0, Math.min(100, Math.floor(params.progress)));
  }

  const updated = await prisma.teamMilestone.update({
    where: { id: params.milestoneId },
    data,
    include: { createdBy: { select: { id: true, name: true } } },
  });
  if (data.completed === true && !wasCompletedPrisma) {
    void incrementContributionCreditField({
      userId: updated.createdByUserId,
      useMockData: false,
      deltaScore: contributionWeights.milestoneCompleted,
      field: "milestonesHit",
    });
  }
  return {
    id: updated.id,
    teamId: updated.teamId,
    title: updated.title,
    description: updated.description ?? undefined,
    targetDate: updated.targetDate.toISOString(),
    completed: updated.completed,
    sortOrder: updated.sortOrder,
    visibility: (updated.visibility === "public" ? "public" : "team_only") as "team_only" | "public",
    progress: updated.progress,
    createdByUserId: updated.createdByUserId,
    createdByName: updated.createdBy.name,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteTeamMilestone(params: {
  teamSlug: string;
  milestoneId: string;
  actorUserId: string;
}): Promise<void> {
  const { teamId } = await assertTeamOwnerBySlug(params.teamSlug, params.actorUserId);

  if (useMockData) {
    const idx = mockTeamMilestones.findIndex((m) => m.id === params.milestoneId && m.teamId === teamId);
    if (idx < 0) {
      throw new Error("TEAM_MILESTONE_NOT_FOUND");
    }
    for (const t of mockTeamTasks) {
      if (t.teamId === teamId && t.milestoneId === params.milestoneId) {
        t.milestoneId = undefined;
        t.updatedAt = new Date().toISOString();
      }
    }
    mockTeamMilestones.splice(idx, 1);
    return;
  }

  const prisma = await getPrisma();
  await prisma.teamTask.updateMany({
    where: { teamId, milestoneId: params.milestoneId },
    data: { milestoneId: null },
  });
  const del = await prisma.teamMilestone.deleteMany({
    where: { id: params.milestoneId, teamId },
  });
  if (del.count === 0) {
    throw new Error("TEAM_MILESTONE_NOT_FOUND");
  }
}

export async function listTeamsForUser(userId: string): Promise<TeamSummary[]> {
  return listTeamsForUserFromShared({ useMockData, getPrisma, userId, mockTeamMemberships, mockTeams, mockProjects });
}

export async function listCreators(params: {
  query?: string;
  page: number;
  limit: number;
}): Promise<Paginated<CreatorProfile>> {
  if (useMockData) {
    const filtered = mockCreators.filter((creator) => {
      if (!params.query) {
        return true;
      }
      const q = params.query.toLowerCase().trim();
      return (
        creator.slug.toLowerCase().includes(q) ||
        creator.bio.toLowerCase().includes(q) ||
        creator.skills.some((skill) => skill.toLowerCase().includes(q))
      );
    });

    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const offset = (params.page - 1) * params.limit;
  const take = params.limit;
  const q = params.query?.trim();

  if (q) {
    const whereSql = creatorFtsWhereClause(q);
    const [countRow] = await prisma.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "CreatorProfile" cp WHERE ${whereSql}`
    );
    const total = Number(countRow?.count ?? 0n);
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        userId: string;
        headline: string;
        bio: string;
        skills: string[];
        collaborationPreference: string;
        createdAt: Date;
        updatedAt: Date;
      }>
    >(Prisma.sql`
      SELECT cp.id, cp.slug, cp."userId", cp.headline, cp.bio, cp.skills, cp."collaborationPreference",
        cp."createdAt", cp."updatedAt"
      FROM "CreatorProfile" cp
      WHERE ${whereSql}
      ORDER BY ts_rank_cd(cp."searchVector", plainto_tsquery('english', ${q})) DESC, cp."updatedAt" DESC
      OFFSET ${offset} LIMIT ${take}
    `);
    return {
      items: rows.map((r) =>
        toCreatorDto({
          ...r,
          collaborationPreference: r.collaborationPreference as CreatorProfile["collaborationPreference"],
        })
      ),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    };
  }

  const [items, total] = await Promise.all([
    prisma.creatorProfile.findMany({
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take,
    }),
    prisma.creatorProfile.count(),
  ]);

  return {
    items: items.map(toCreatorDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function getCreatorBySlug(slug: string): Promise<CreatorProfile | null> {
  if (useMockData) {
    return mockCreators.find((creator) => creator.slug === slug) ?? null;
  }

  const prisma = await getPrisma();
  const creator = await prisma.creatorProfile.findUnique({
    where: { slug },
  });
  return creator ? toCreatorDto(creator) : null;
}

export async function getCreatorProfileById(creatorId: string): Promise<CreatorProfile | null> {
  if (useMockData) {
    return mockCreators.find((c) => c.id === creatorId) ?? null;
  }

  const prisma = await getPrisma();
  const creator = await prisma.creatorProfile.findUnique({
    where: { id: creatorId },
  });
  return creator ? toCreatorDto(creator) : null;
}

// ─── M-1: Subscription ────────────────────────────────────────────────────────

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  return getUserSubscriptionFromDomain(userId);
}

export async function upsertUserSubscription(params: {
  userId: string;
  tier: UserSubscription["tier"];
  status: UserSubscription["status"];
  enterpriseStatus?: UserSubscription["enterpriseStatus"];
  enterpriseRequestedAt?: Date | null;
  enterpriseReviewedAt?: Date | null;
  enterpriseReviewedBy?: string | null;
  enterpriseOrgName?: string | null;
  enterpriseOrgWebsite?: string | null;
  enterpriseWorkEmail?: string | null;
  enterpriseUseCase?: string | null;
  enterpriseReviewNote?: string | null;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}): Promise<UserSubscription> {
  return upsertUserSubscriptionFromDomain(params);
}

export async function getUserTier(userId: string): Promise<UserSubscription["tier"]> {
  return getUserTierFromDomain(userId);
}

export async function countUserTeams(userId: string): Promise<number> {
  if (useMockData) {
    return mockTeams.filter((t) => t.ownerUserId === userId).length;
  }
  const prisma = await getPrisma();
  return prisma.team.count({ where: { ownerUserId: userId } });
}

/** Teams this user owns (for collaboration intent invite dropdown). */
export async function listOwnedTeamSummariesForUser(userId: string): Promise<Array<{ slug: string; name: string }>> {
  if (useMockData) {
    return mockTeams
      .filter((t) => t.ownerUserId === userId)
      .map((t) => ({ slug: t.slug, name: t.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  const prisma = await getPrisma();
  const rows = await prisma.team.findMany({
    where: { ownerUserId: userId },
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });
  return rows;
}

export async function getUserDisplayNames(userIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const out: Record<string, string> = {};
  if (unique.length === 0) return out;
  if (useMockData) {
    for (const id of unique) {
      const u = mockUsers.find((x) => x.id === id);
      if (u) out[id] = u.name;
    }
    return out;
  }
  const prisma = await getPrisma();
  const rows = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  for (const r of rows) {
    out[r.id] = r.name;
  }
  return out;
}

export async function countUserProjects(userId: string): Promise<number> {
  if (useMockData) {
    return mockProjects.filter((p) => {
      const creator = mockCreators.find((c) => c.id === p.creatorId);
      return creator?.userId === userId;
    }).length;
  }
  const prisma = await getPrisma();
  const creator = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!creator) return 0;
  return prisma.project.count({ where: { creatorId: creator.id } });
}

export async function upsertStripeCustomer(userId: string, stripeCustomerId: string): Promise<void> {
  if (useMockData) {
    const user = mockUsers.find((u) => u.id === userId);
    if (user) user.stripeCustomerId = stripeCustomerId;
    return;
  }
  const prisma = await getPrisma();
  await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId } });
}

export async function getCreatorProfileByUserId(userId: string): Promise<CreatorProfile | null> {
  if (useMockData) {
    return mockCreators.find((c) => c.userId === userId) ?? null;
  }

  const prisma = await getPrisma();
  const creator = await prisma.creatorProfile.findUnique({
    where: { userId },
  });
  return creator ? toCreatorDto(creator) : null;
}

export interface CreateProfileInput {
  userId: string;
  slug: string;
  headline: string;
  bio: string;
  skills: string[];
  avatarUrl?: string;
  websiteUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  collaborationPreference?: string;
}

export async function createCreatorProfile(input: CreateProfileInput): Promise<CreatorProfile> {
  if (useMockData) {
    const existing = mockCreators.find((c) => c.userId === input.userId);
    if (existing) {
      throw new Error("PROFILE_ALREADY_EXISTS");
    }
    if (mockCreators.find((c) => c.slug === input.slug)) {
      throw new Error("SLUG_TAKEN");
    }
    const profile: CreatorProfile = {
      id: `c-${Date.now()}`,
      slug: input.slug,
      userId: input.userId,
      headline: input.headline,
      bio: input.bio,
      skills: input.skills,
      collaborationPreference: (input.collaborationPreference === "invite_only" || input.collaborationPreference === "closed") ? input.collaborationPreference : "open",
    };
    mockCreators.push(profile);
    return profile;
  }

  const prisma = await getPrisma();
  try {
    const created = await prisma.creatorProfile.create({
      data: {
        slug: input.slug,
        userId: input.userId,
        headline: input.headline,
        bio: input.bio,
        skills: input.skills,
        collaborationPreference: input.collaborationPreference ?? "open",
      },
    });
    return toCreatorDto(created);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta?.target as string[]) ?? [];
      if (target.includes("slug")) throw new Error("SLUG_TAKEN");
      if (target.includes("userId")) throw new Error("PROFILE_ALREADY_EXISTS");
    }
    const mapped = mapPrismaToRepositoryError(err);
    if (mapped) throw mapped;
    throw err;
  }
}

export interface UpdateProfileInput {
  headline?: string;
  bio?: string;
  skills?: string[];
  avatarUrl?: string;
  websiteUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  collaborationPreference?: string;
}

export async function updateCreatorProfile(userId: string, input: UpdateProfileInput): Promise<CreatorProfile> {
  if (useMockData) {
    const profile = mockCreators.find((c) => c.userId === userId);
    if (!profile) {
      throw new Error("PROFILE_NOT_FOUND");
    }
    if (input.headline !== undefined) profile.headline = input.headline;
    if (input.bio !== undefined) profile.bio = input.bio;
    if (input.skills !== undefined) profile.skills = input.skills;
    if (input.avatarUrl !== undefined) profile.avatarUrl = input.avatarUrl;
    if (input.websiteUrl !== undefined) profile.websiteUrl = input.websiteUrl;
    if (input.githubUrl !== undefined) profile.githubUrl = input.githubUrl;
    if (input.twitterUrl !== undefined) profile.twitterUrl = input.twitterUrl;
    if (input.linkedinUrl !== undefined) profile.linkedinUrl = input.linkedinUrl;
    if (input.collaborationPreference !== undefined) {
      profile.collaborationPreference =
        (input.collaborationPreference === "invite_only" || input.collaborationPreference === "closed")
          ? input.collaborationPreference : "open";
    }
    return profile;
  }

  const prisma = await getPrisma();
  const existing = await prisma.creatorProfile.findUnique({ where: { userId } });
  if (!existing) {
    throw new Error("PROFILE_NOT_FOUND");
  }
  const data: Record<string, unknown> = {};
  if (input.headline !== undefined) data.headline = input.headline;
  if (input.bio !== undefined) data.bio = input.bio;
  if (input.skills !== undefined) data.skills = input.skills;
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;
  if (input.websiteUrl !== undefined) data.websiteUrl = input.websiteUrl;
  if (input.githubUrl !== undefined) data.githubUrl = input.githubUrl;
  if (input.twitterUrl !== undefined) data.twitterUrl = input.twitterUrl;
  if (input.linkedinUrl !== undefined) data.linkedinUrl = input.linkedinUrl;
  if (input.collaborationPreference !== undefined) data.collaborationPreference = input.collaborationPreference;

  const updated = await prisma.creatorProfile.update({
    where: { userId },
    data,
  });
  return toCreatorDto(updated);
}

export async function listUsers(params: {
  query?: string;
  page: number;
  limit: number;
}): Promise<Paginated<User>> {
  if (useMockData) {
    const filtered = mockUsers.filter((user) => {
      const q = params.query?.toLowerCase().trim();
      if (!q) {
        return true;
      }
      return user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
    });
    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where = params.query
    ? {
        OR: [
          { name: { contains: params.query, mode: "insensitive" as const } },
          { email: { contains: params.query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: items.map(toUserDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function listPosts(params: {
  query?: string;
  tag?: string;
  /** Only posts by this user id */
  authorId?: string;
  /** P2: "latest" | "hot" | "featured" */
  sort?: string;
  /** P2: only return featured posts */
  featuredOnly?: boolean;
  /** P1: when set, include this author's non-approved posts (for "my submissions") */
  includeAuthorId?: string;
  page: number;
  limit: number;
  /** P4-3: keyset pagination (only with stable sort: no query, sort recent/default, not featured-only) */
  cursor?: string | null;
}): Promise<Paginated<Post>> {
  return listPostsFromDomain(params);
}

export async function listPostsForModeration(params: {
  status?: ReviewStatus | "all";
  query?: string;
  page: number;
  limit: number;
}): Promise<Paginated<Post>> {
  if (useMockData) {
    const filtered = mockPosts.filter((post) => {
      const query = params.query?.toLowerCase().trim();
      const statusMatch = !params.status || params.status === "all" || post.reviewStatus === params.status;
      const queryMatch =
        !query ||
        post.title.toLowerCase().includes(query) ||
        post.body.toLowerCase().includes(query) ||
        post.tags.some((tag) => tag.toLowerCase().includes(query));
      return statusMatch && queryMatch;
    });
    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const offset = (params.page - 1) * params.limit;
  const take = params.limit;
  const q = params.query?.trim();

  if (q) {
    const statusSql =
      params.status && params.status !== "all"
        ? Prisma.sql`p."reviewStatus" = CAST(${params.status} AS "ReviewStatus")`
        : Prisma.sql`TRUE`;
    const whereSql = Prisma.join(
      [statusSql, Prisma.sql`p."searchVector" @@ plainto_tsquery('english', ${q})`],
      " AND "
    );
    const [countRow] = await prisma.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "Post" p WHERE ${whereSql}`
    );
    const total = Number(countRow?.count ?? 0n);
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        authorId: string;
        title: string;
        body: string;
        tags: string[];
        reviewStatus: ReviewStatus;
        moderationNote: string | null;
        reviewedAt: Date | null;
        reviewedBy: string | null;
        featuredAt: Date | null;
        featuredBy: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >(Prisma.sql`
      SELECT p.id, p.slug, p."authorId", p.title, p.body, p.tags, p."reviewStatus", p."moderationNote",
        p."reviewedAt", p."reviewedBy", p."featuredAt", p."featuredBy", p."createdAt", p."updatedAt"
      FROM "Post" p
      WHERE ${whereSql}
      ORDER BY p."reviewStatus" ASC, p."createdAt" DESC
      OFFSET ${offset} LIMIT ${take}
    `);
    return {
      items: rows.map(toPostDto),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    };
  }

  const where = {
    AND: [params.status && params.status !== "all" ? { reviewStatus: params.status } : {}],
  };

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ reviewStatus: "asc" }, { createdAt: "desc" }],
      skip: offset,
      take,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    items: items.map(toPostDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function getPostBySlug(
  slug: string,
  options?: { viewerUserId?: string }
): Promise<Post | null> {
  return getPostBySlugFromDomain(slug, options);
}

/** Deterministic 100-char excerpt — no AI dep, available immediately. */
export function generatePostSummary(body: string): string {
  const clean = body.replace(/\s+/g, " ").trim();
  if (clean.length <= 120) return clean;
  const cut = clean.slice(0, 120);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut) + "…";
}

export async function createPost(input: {
  title: string;
  body: string;
  tags: string[];
  authorId: string;
}) {
  return createPostFromDomain(input);
}

// ─── Post update / delete ─────────────────────────────────────────────────────

export async function updatePost(params: {
  slug: string;
  actorUserId: string;
  actorRole: Role;
  title?: string;
  body?: string;
  tags?: string[];
}): Promise<Post> {
  if (params.title !== undefined) assertContentSafeText(params.title, "title");
  if (params.body !== undefined) assertContentSafeText(params.body, "body");
  if (useMockData) {
    const post = mockPosts.find((p) => p.slug === params.slug);
    if (!post) throw new Error("POST_NOT_FOUND");
    if (post.authorId !== params.actorUserId && params.actorRole !== "admin") {
      throw new Error("FORBIDDEN_NOT_AUTHOR");
    }
    if (params.title !== undefined) post.title = params.title;
    if (params.body  !== undefined) post.body  = params.body;
    if (params.tags  !== undefined) post.tags  = params.tags;
    mockAuditLogs.unshift({
      id: `log_post_up_${Date.now()}`,
      actorId: params.actorUserId,
      action: "post_updated",
      entityType: "post",
      entityId: post.id,
      metadata: { slug: post.slug },
      createdAt: new Date().toISOString(),
    });
    return { ...post };
  }
  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({ where: { slug: params.slug } });
  if (!post) throw new Error("POST_NOT_FOUND");
  if (post.authorId !== params.actorUserId && params.actorRole !== "admin") {
    throw new Error("FORBIDDEN_NOT_AUTHOR");
  }
  const data: Prisma.PostUpdateInput = {};
  if (params.title !== undefined) data.title = params.title;
  if (params.body  !== undefined) data.body  = params.body;
  if (params.tags  !== undefined) data.tags  = params.tags;
  const updated = await prisma.post.update({ where: { id: post.id }, data });
  await prisma.auditLog.create({
    data: {
      actorId: params.actorUserId,
      action: "post_updated",
      entityType: "post",
      entityId: post.id,
      metadata: { slug: post.slug },
    },
  });
  return toPostDto(updated);
}

export async function deletePost(params: {
  slug: string;
  actorUserId: string;
  actorRole: Role;
}): Promise<void> {
  if (useMockData) {
    const idx = mockPosts.findIndex((p) => p.slug === params.slug);
    if (idx === -1) throw new Error("POST_NOT_FOUND");
    if (mockPosts[idx].authorId !== params.actorUserId && params.actorRole !== "admin") {
      throw new Error("FORBIDDEN_NOT_AUTHOR");
    }
    const deletedId = mockPosts[idx].id;
    mockPosts.splice(idx, 1);
    mockAuditLogs.unshift({
      id: `log_post_del_${Date.now()}`,
      actorId: params.actorUserId,
      action: "post_deleted",
      entityType: "post",
      entityId: deletedId,
      metadata: { slug: params.slug },
      createdAt: new Date().toISOString(),
    });
    return;
  }
  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({ where: { slug: params.slug } });
  if (!post) throw new Error("POST_NOT_FOUND");
  if (post.authorId !== params.actorUserId && params.actorRole !== "admin") {
    throw new Error("FORBIDDEN_NOT_AUTHOR");
  }
  await prisma.$transaction([
    prisma.post.delete({ where: { id: post.id } }),
    prisma.auditLog.create({
      data: {
        actorId: params.actorUserId,
        action: "post_deleted",
        entityType: "post",
        entityId: post.id,
        metadata: { slug: params.slug },
      },
    }),
  ]);
}

export async function getPostIdBySlug(slug: string): Promise<string | null> {
  if (useMockData) {
    return mockPosts.find((p) => p.slug === slug)?.id ?? null;
  }
  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({ where: { slug }, select: { id: true } });
  return post?.id ?? null;
}

export async function createComment(input: { postId: string; body: string; authorId: string; parentCommentId?: string }) {
  assertContentSafeText(input.body, "body");
  if (useMockData) {
    const postExists = mockPosts.some((post) => post.id === input.postId);
    if (!postExists) {
      throw new Error("POST_NOT_FOUND");
    }
    if (input.parentCommentId) {
      const parent = mockComments.find((c) => c.id === input.parentCommentId);
      if (!parent) throw new Error("PARENT_COMMENT_NOT_FOUND");
      // max depth 2: parent itself must have no parent (i.e. be a root comment)
      if (parent.parentCommentId) throw new Error("MAX_NESTING_DEPTH_EXCEEDED");
    }
    const author = mockUsers.find((u) => u.id === input.authorId);
    const comment: Comment = {
      id: `cm_${Date.now()}`,
      postId: input.postId,
      authorId: input.authorId,
      authorName: author?.name ?? input.authorId,
      body: input.body,
      parentCommentId: input.parentCommentId,
      createdAt: new Date().toISOString(),
    };
    mockComments.unshift(comment);
    void incrementContributionCreditField({
      userId: input.authorId,
      useMockData: true,
      deltaScore: contributionWeights.comment,
      field: "commentsAuthored",
    });
    return comment;
  }

  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: { id: true, reviewStatus: true },
  });
  if (!post || post.reviewStatus !== "approved") {
    throw new Error("POST_NOT_FOUND");
  }
  if (input.parentCommentId) {
    const parent = await prisma.comment.findUnique({ where: { id: input.parentCommentId }, select: { parentCommentId: true } });
    if (!parent) throw new Error("PARENT_COMMENT_NOT_FOUND");
    if (parent.parentCommentId) throw new Error("MAX_NESTING_DEPTH_EXCEEDED");
  }
  const comment = await prisma.comment.create({
    data: {
      postId: input.postId,
      body: input.body,
      authorId: input.authorId,
      parentCommentId: input.parentCommentId ?? null,
    },
    include: { author: { select: { name: true } } },
  });
  void incrementContributionCreditField({
    userId: input.authorId,
    useMockData: false,
    deltaScore: contributionWeights.comment,
    field: "commentsAuthored",
  });
  return toCommentDto({ ...comment, authorName: comment.author.name });
}

export async function listCommentsForPost(input: string | { postId: string; page?: number; limit?: number }): Promise<Paginated<Comment>> {
  const postId = typeof input === "string" ? input : input.postId;
  const isPaginated = typeof input !== "string";
  const page = isPaginated ? (input.page ?? 1) : 1;
  const limit = isPaginated ? (input.limit ?? 100) : 100;

  if (useMockData) {
    const rootComments = mockComments
      .filter((c) => c.postId === postId && !c.parentCommentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((root) => ({
        ...root,
        replies: mockComments.filter((c) => c.parentCommentId === root.id),
      }));
    return paginateArray(rootComments, page, limit);
  }
  const prisma = await getPrisma();
  const rows = await prisma.comment.findMany({
    where: { postId, parentCommentId: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { name: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });
  const comments = rows.map((r) =>
    toCommentDto({
      ...r,
      authorName: r.author.name,
      replies: r.replies.map((reply) => ({ ...reply, authorName: reply.author.name })),
    })
  );
  return paginateArray(comments, page, limit);
}

// ─── C-1: Social Interactions ───────────────────────────────────────────────

export async function togglePostLike(userId: string, postSlug: string): Promise<{ liked: boolean; likeCount: number }> {
  if (useMockData) {
    const post = mockPosts.find((p) => p.slug === postSlug);
    if (!post) throw new Error("POST_NOT_FOUND");
    const existing = mockPostLikes.findIndex((l) => l.userId === userId && l.postId === post.id);
    if (existing >= 0) {
      mockPostLikes.splice(existing, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
      return { liked: false, likeCount: post.likeCount };
    }
    mockPostLikes.push({ id: `like_${Date.now()}`, userId, postId: post.id, createdAt: new Date().toISOString() });
    post.likeCount = (post.likeCount || 0) + 1;
    if (post.authorId !== userId) {
      const liker = mockUsers.find((u) => u.id === userId);
      void notifyUser({
        userId: post.authorId,
        kind: "post_liked",
        title: "New like on your post",
        body: `${liker?.name ?? "Someone"} liked “${post.title}”.`,
        metadata: { postSlug: post.slug },
      });
    }
    return { liked: true, likeCount: post.likeCount };
  }
  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({
    where: { slug: postSlug },
    select: { id: true, authorId: true, title: true, slug: true },
  });
  if (!post) throw new Error("POST_NOT_FOUND");
  const existing = await prisma.postLike.findUnique({ where: { userId_postId: { userId, postId: post.id } } });
  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
    const count = await prisma.postLike.count({ where: { postId: post.id } });
    return { liked: false, likeCount: count };
  }
  await prisma.postLike.create({ data: { userId, postId: post.id } });
  const count = await prisma.postLike.count({ where: { postId: post.id } });
  if (post.authorId !== userId) {
    const liker = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    void notifyUser({
      userId: post.authorId,
      kind: "post_liked",
      title: "New like on your post",
      body: `${liker?.name ?? "Someone"} liked “${post.title}”.`,
      metadata: { postSlug: post.slug },
    });
  }
  return { liked: true, likeCount: count };
}

export async function togglePostBookmark(
  userId: string,
  postSlug: string
): Promise<{ bookmarked: boolean; bookmarkCount: number }> {
  if (useMockData) {
    const post = mockPosts.find((p) => p.slug === postSlug);
    if (!post) throw new Error("POST_NOT_FOUND");
    const existing = mockPostBookmarks.findIndex((b) => b.userId === userId && b.postId === post.id);
    if (existing >= 0) {
      mockPostBookmarks.splice(existing, 1);
      post.bookmarkCount = Math.max(0, post.bookmarkCount - 1);
      return { bookmarked: false, bookmarkCount: post.bookmarkCount };
    }
    mockPostBookmarks.push({ id: `bk_${Date.now()}`, userId, postId: post.id, createdAt: new Date().toISOString() });
    post.bookmarkCount = (post.bookmarkCount || 0) + 1;
    return { bookmarked: true, bookmarkCount: post.bookmarkCount };
  }
  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({ where: { slug: postSlug }, select: { id: true } });
  if (!post) throw new Error("POST_NOT_FOUND");
  const existing = await prisma.postBookmark.findUnique({ where: { userId_postId: { userId, postId: post.id } } });
  if (existing) {
    await prisma.postBookmark.delete({ where: { id: existing.id } });
    const bookmarkCount = await prisma.postBookmark.count({ where: { postId: post.id } });
    return { bookmarked: false, bookmarkCount };
  }
  await prisma.postBookmark.create({ data: { userId, postId: post.id } });
  const bookmarkCount = await prisma.postBookmark.count({ where: { postId: post.id } });
  return { bookmarked: true, bookmarkCount };
}

export async function toggleProjectBookmark(userId: string, projectSlug: string): Promise<{ bookmarked: boolean }> {
  if (useMockData) {
    const project = mockProjects.find((p) => p.slug === projectSlug);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    const existing = mockProjectBookmarks.findIndex((b) => b.userId === userId && b.projectId === project.id);
    if (existing >= 0) {
      mockProjectBookmarks.splice(existing, 1);
      return { bookmarked: false };
    }
    mockProjectBookmarks.push({ id: `pbk_${Date.now()}`, userId, projectId: project.id, createdAt: new Date().toISOString() });
    return { bookmarked: true };
  }
  const prisma = await getPrisma();
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  const existing = await prisma.projectBookmark.findUnique({ where: { userId_projectId: { userId, projectId: project.id } } });
  if (existing) {
    await prisma.projectBookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }
  await prisma.projectBookmark.create({ data: { userId, projectId: project.id } });
  return { bookmarked: true };
}

export async function toggleUserFollow(followerId: string, followingSlug: string): Promise<{ following: boolean }> {
  if (useMockData) {
    // In mock mode, followingSlug is used as userId directly OR as githubUsername
    const target = mockUsers.find((u) => u.githubUsername === followingSlug || u.id === followingSlug);
    if (!target) throw new Error("USER_NOT_FOUND");
    if (target.id === followerId) throw new Error("CANNOT_FOLLOW_SELF");
    const existing = mockUserFollows.findIndex((f) => f.followerId === followerId && f.followingId === target.id);
    if (existing >= 0) {
      mockUserFollows.splice(existing, 1);
      return { following: false };
    }
    mockUserFollows.push({ id: `f_${Date.now()}`, followerId, followingId: target.id, createdAt: new Date().toISOString() });
    return { following: true };
  }
  // In DB mode, resolve slug via CreatorProfile.slug → userId
  const prisma = await getPrisma();
  const creator = await prisma.creatorProfile.findUnique({ where: { slug: followingSlug }, select: { userId: true } });
  if (!creator) throw new Error("USER_NOT_FOUND");
  const followingId = creator.userId;
  if (followingId === followerId) throw new Error("CANNOT_FOLLOW_SELF");
  const existing = await prisma.userFollow.findUnique({ where: { followerId_followingId: { followerId, followingId } } });
  if (existing) {
    await prisma.userFollow.delete({ where: { id: existing.id } });
    return { following: false };
  }
  await prisma.userFollow.create({ data: { followerId, followingId } });
  return { following: true };
}

export async function getMyBookmarks(userId: string): Promise<{ posts: Post[]; projects: Project[] }> {
  if (useMockData) {
    const postIds = mockPostBookmarks.filter((b) => b.userId === userId).map((b) => b.postId);
    const projectIds = mockProjectBookmarks.filter((b) => b.userId === userId).map((b) => b.projectId);
    return {
      posts: mockPosts.filter((p) => postIds.includes(p.id)),
      projects: mockProjects.filter((p) => projectIds.includes(p.id)),
    };
  }
  const prisma = await getPrisma();
  const [postBkm, projectBkm] = await Promise.all([
    prisma.postBookmark.findMany({ where: { userId }, include: { post: true } }),
    prisma.projectBookmark.findMany({ where: { userId }, include: { project: { include: { team: { select: { slug: true, name: true } } } } } }),
  ]);
  return {
    posts: postBkm.map((b) => toPostDto(b.post as Parameters<typeof toPostDto>[0])),
    projects: projectBkm.map((b) => toProjectDto(b.project as Parameters<typeof toProjectDto>[0])),
  };
}

export async function getFollowFeed(userId: string, params: { page: number; limit: number }): Promise<Paginated<Post>> {
  if (useMockData) {
    const followingIds = mockUserFollows.filter((f) => f.followerId === userId).map((f) => f.followingId);
    if (followingIds.length === 0) {
      return listPosts({ sort: "hot", page: params.page, limit: params.limit });
    }
    const items = mockPosts
      .filter((p) => followingIds.includes(p.authorId) && p.reviewStatus === "approved")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return paginateArray(items, params.page, params.limit);
  }
  const prisma = await getPrisma();
  const followingRows = await prisma.userFollow.findMany({ where: { followerId: userId }, select: { followingId: true } });
  const followingIds = followingRows.map((r) => r.followingId);
  if (followingIds.length === 0) {
    return listPosts({ sort: "hot", page: params.page, limit: params.limit });
  }
  const where = { authorId: { in: followingIds }, reviewStatus: "approved" as const };
  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      include: { author: { select: { name: true } }, _count: { select: { likes: true, bookmarks: true } } },
    }),
    prisma.post.count({ where }),
  ]);
  return {
    items: items.map((p) => toPostDto({ ...p, authorName: p.author.name, likeCount: p._count.likes, bookmarkCount: p._count.bookmarks })),
    pagination: { page: params.page, limit: params.limit, total, totalPages: Math.max(1, Math.ceil(total / params.limit)) },
  };
}

// ─── C-5: Project Daily Featured ─────────────────────────────────────────────

export async function featureProjectToday(projectSlug: string, rank: number): Promise<Project> {
  if (useMockData) {
    const project = mockProjects.find((p) => p.slug === projectSlug);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    project.featuredRank = rank;
    project.featuredAt = new Date().toISOString();
    return project;
  }
  const prisma = await getPrisma();
  const updated = await prisma.project.update({
    where: { slug: projectSlug },
    data: { featuredRank: rank, featuredAt: new Date() },
    include: { team: { select: { slug: true, name: true } } },
  });
  return toProjectDto({ ...updated, team: updated.team });
}

export async function clearProjectFeatured(projectSlug: string): Promise<Project> {
  if (useMockData) {
    const project = mockProjects.find((p) => p.slug === projectSlug);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    delete project.featuredRank;
    delete project.featuredAt;
    return project;
  }
  const prisma = await getPrisma();
  const updated = await prisma.project.update({
    where: { slug: projectSlug },
    data: { featuredRank: null, featuredAt: null },
    include: { team: { select: { slug: true, name: true } } },
  });
  return toProjectDto({ ...updated, team: updated.team });
}

export async function clearExpiredFeaturedProjects(): Promise<number> {
  if (useMockData) {
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let cleared = 0;
    for (const p of mockProjects) {
      const ext = p as Project & { featuredRank?: number; featuredAt?: string };
      if (ext.featuredAt && new Date(ext.featuredAt) < midnight) {
        delete ext.featuredRank;
        delete ext.featuredAt;
        cleared++;
      }
    }
    return cleared;
  }
  const prisma = await getPrisma();
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  const res = await prisma.project.updateMany({
    where: { featuredAt: { lt: midnight }, featuredRank: { not: null } },
    data: { featuredRank: null, featuredAt: null },
  });
  return res.count;
}

export interface ProjectMetadata {
  slug: string;
  title: string;
  oneLiner: string;
  status: string;
  techStack: string[];
  tags: string[];
  repoUrl?: string;
  websiteUrl?: string;
  demoUrl?: string;
  openSource: boolean;
  license?: string;
  logoUrl?: string;
  screenshots: string[];
  team?: { slug: string; name: string } | null;
  publicMilestones: Array<{ title: string; progress: number; completed: boolean; targetDate: string }>;
  githubStats?: GitHubRepoStats | null;
  createdAt: string;
  updatedAt: string;
}

// ─── A-2: Talent Radar ───────────────────────────────────────────────────────

export async function getTalentRadar(params: {
  skill?: string;
  collaborationPreference?: string;
  page: number;
  limit: number;
}): Promise<{ items: CreatorProfile[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  if (useMockData) {
    const filtered = mockCreators.filter((c) => {
      const skillMatch = !params.skill || c.skills.some((s) => s.toLowerCase().includes(params.skill!.toLowerCase()));
      const prefMatch = !params.collaborationPreference || c.collaborationPreference === params.collaborationPreference;
      return skillMatch && prefMatch;
    });
    return paginateArray(filtered, params.page, params.limit);
  }
  const prisma = await getPrisma();
  const where: Record<string, unknown> = {};
  if (params.collaborationPreference) {
    where.collaborationPreference = params.collaborationPreference;
  }
  if (params.skill) {
    where.skills = { has: params.skill };
  }
  const [items, total] = await Promise.all([
    prisma.creatorProfile.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.creatorProfile.count({ where }),
  ]);
  return {
    items: items.map(toCreatorDto),
    pagination: { page: params.page, limit: params.limit, total, totalPages: Math.max(1, Math.ceil(total / params.limit)) },
  };
}

export async function getProjectMetadata(slug: string): Promise<ProjectMetadata | null> {
  const project = await getProjectBySlug(slug);
  if (!project) return null;
  const milestones = await listPublicMilestonesForProject(project.id);
  const githubStats = project.repoUrl ? await getGitHubRepoStats(project.repoUrl).catch(() => null) : null;
  return {
    slug: project.slug,
    title: project.title,
    oneLiner: project.oneLiner,
    status: project.status,
    techStack: project.techStack,
    tags: project.tags,
    repoUrl: project.repoUrl,
    websiteUrl: project.websiteUrl,
    demoUrl: project.demoUrl,
    openSource: project.openSource,
    license: project.license,
    logoUrl: project.logoUrl,
    screenshots: project.screenshots,
    team: project.team ?? null,
    publicMilestones: milestones.map((m) => ({
      title: m.title,
      progress: m.progress,
      completed: m.completed,
      targetDate: m.targetDate,
    })),
    githubStats,
    createdAt: project.updatedAt,
    updatedAt: project.updatedAt,
  };
}

export async function listFeaturedProjects(): Promise<Project[]> {
  if (useMockData) {
    return mockProjects
      .filter((p) => (p as Project & { featuredRank?: number }).featuredRank != null)
      .sort((a, b) => {
        const ra = (a as Project & { featuredRank?: number }).featuredRank ?? 999;
        const rb = (b as Project & { featuredRank?: number }).featuredRank ?? 999;
        return ra - rb;
      });
  }
  const prisma = await getPrisma();
  const rows = await prisma.project.findMany({
    where: { featuredRank: { not: null } },
    orderBy: { featuredRank: "asc" },
    include: { team: { select: { slug: true, name: true } } },
  });
  return rows.map((r) => toProjectDto({ ...r, team: r.team }));
}

// ─── C-6: GitHub Repo Stats Cache ────────────────────────────────────────────

const githubStatsCache = new Map<string, { stats: GitHubRepoStats; expiresAt: number }>();

export async function getGitHubRepoStats(repoUrl: string): Promise<GitHubRepoStats | null> {
  const cached = githubStatsCache.get(repoUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.stats;
  }
  try {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, "");
    const res = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    interface GHRepo { stargazers_count: number; forks_count: number; language: string | null; pushed_at: string; open_issues_count: number; }
    const data = await res.json() as GHRepo;
    const stats: GitHubRepoStats = {
      stars: data.stargazers_count,
      forks: data.forks_count,
      language: data.language,
      lastPushedAt: data.pushed_at,
      openIssues: data.open_issues_count,
      cachedAt: new Date().toISOString(),
    };
    githubStatsCache.set(repoUrl, { stats, expiresAt: Date.now() + 3_600_000 });
    return stats;
  } catch {
    return null;
  }
}

// ─── C-7: Unified Full-Text Search ───────────────────────────────────────────

export async function unifiedSearch(query: string, type?: "post" | "project" | "creator"): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  if (useMockData) {
    const ql = q.toLowerCase();
    const results: SearchResult[] = [];
    if (!type || type === "post") {
      mockPosts
        .filter((p) => p.reviewStatus === "approved" && (p.title.toLowerCase().includes(ql) || p.body.toLowerCase().includes(ql)))
        .forEach((p) => results.push({ type: "post", id: p.id, slug: p.slug, title: p.title, excerpt: p.body.slice(0, 120), tags: p.tags }));
    }
    if (!type || type === "project") {
      mockProjects
        .filter((p) => p.title.toLowerCase().includes(ql) || p.oneLiner.toLowerCase().includes(ql) || p.description.toLowerCase().includes(ql))
        .forEach((p) => results.push({ type: "project", id: p.id, slug: p.slug, title: p.title, excerpt: p.oneLiner, tags: p.tags }));
    }
    if (!type || type === "creator") {
      mockCreators
        .filter((c) => c.slug.toLowerCase().includes(ql) || c.bio.toLowerCase().includes(ql) || c.skills.some((s) => s.toLowerCase().includes(ql)))
        .forEach((c) => results.push({ type: "creator", id: c.id, slug: c.slug, title: c.slug, excerpt: c.bio.slice(0, 120) }));
    }
    return results;
  }

  const prisma = await getPrisma();
  const results: SearchResult[] = [];

  if (!type || type === "post") {
    const posts = await prisma.$queryRaw<Array<{ id: string; slug: string; title: string; body: string; tags: string[] }>>`
      SELECT id, slug, title, body, tags
      FROM "Post"
      WHERE "reviewStatus" = 'approved'
        AND "searchVector" @@ plainto_tsquery('english', ${q})
      ORDER BY ts_rank("searchVector", plainto_tsquery('english', ${q})) DESC
      LIMIT 10
    `;
    posts.forEach((p) => results.push({ type: "post", id: p.id, slug: p.slug, title: p.title, excerpt: p.body.slice(0, 120), tags: p.tags }));
  }

  if (!type || type === "project") {
    const projects = await prisma.$queryRaw<Array<{ id: string; slug: string; title: string; "oneLiner": string; tags: string[] }>>`
      SELECT id, slug, title, "oneLiner", tags
      FROM "Project"
      WHERE "searchVector" @@ plainto_tsquery('english', ${q})
      ORDER BY ts_rank("searchVector", plainto_tsquery('english', ${q})) DESC
      LIMIT 10
    `;
    projects.forEach((p) => results.push({ type: "project", id: p.id, slug: p.slug, title: p.title, excerpt: p.oneLiner, tags: p.tags }));
  }

  if (!type || type === "creator") {
    const whereSql = creatorFtsWhereClause(q);
    const creators = await prisma.$queryRaw<Array<{ id: string; slug: string; headline: string; bio: string }>>`
      SELECT id, slug, headline, bio
      FROM "CreatorProfile"
      WHERE ${whereSql}
      ORDER BY ts_rank_cd("searchVector", plainto_tsquery('english', ${q})) DESC
      LIMIT 10
    `;
    creators.forEach((c) =>
      results.push({ type: "creator", id: c.id, slug: c.slug, title: c.slug, excerpt: (c.headline || c.bio).slice(0, 120) })
    );
  }

  return results;
}

/** P3-2: unified search with total + pagination (type recommended when page > 1). */
export async function unifiedSearchPaged(params: {
  query: string;
  type?: "post" | "project" | "creator";
  page: number;
  limit: number;
}): Promise<{ results: SearchResult[]; total: number; page: number; limit: number }> {
  const q = params.query.trim();
  const page = Math.max(1, params.page);
  const limit = Math.min(Math.max(params.limit, 1), 50);
  const offset = (page - 1) * limit;
  if (!q) return { results: [], total: 0, page, limit };

  if (useMockData) {
    const all = await unifiedSearch(q, params.type);
    return { results: all.slice(offset, offset + limit), total: all.length, page, limit };
  }

  const prisma = await getPrisma();

  if (!params.type) {
    const all = await unifiedSearch(q, undefined);
    return { results: all.slice(offset, offset + limit), total: all.length, page, limit };
  }

  if (params.type === "post") {
    const whereSql = postFtsWhereClause(q, {});
    const [cRow] = await prisma.$queryRaw<[{ c: bigint }]>(Prisma.sql`SELECT COUNT(*)::bigint AS c FROM "Post" p WHERE ${whereSql}`);
    const total = Number(cRow?.c ?? 0n);
    const rows = await prisma.$queryRaw<Array<{ id: string; slug: string; title: string; body: string; tags: string[] }>>`
      SELECT id, slug, title, body, tags FROM "Post" p
      WHERE ${whereSql}
      ORDER BY ts_rank_cd(p."searchVector", plainto_tsquery('english', ${q})) DESC
      OFFSET ${offset} LIMIT ${limit}
    `;
    return {
      results: rows.map((p) => ({ type: "post" as const, id: p.id, slug: p.slug, title: p.title, excerpt: p.body.slice(0, 120), tags: p.tags })),
      total,
      page,
      limit,
    };
  }

  if (params.type === "project") {
    const whereSql = projectFtsWhereClause(q, {});
    const [cRow] = await prisma.$queryRaw<[{ c: bigint }]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS c FROM "Project" p WHERE ${whereSql}`
    );
    const total = Number(cRow?.c ?? 0n);
    const rows = await prisma.$queryRaw<Array<{ id: string; slug: string; title: string; oneLiner: string; tags: string[] }>>`
      SELECT id, slug, title, "oneLiner", tags FROM "Project" p
      WHERE ${whereSql}
      ORDER BY ts_rank_cd(p."searchVector", plainto_tsquery('english', ${q})) DESC
      OFFSET ${offset} LIMIT ${limit}
    `;
    return {
      results: rows.map((p) => ({
        type: "project" as const,
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.oneLiner,
        tags: p.tags,
      })),
      total,
      page,
      limit,
    };
  }

  const whereSql = creatorFtsWhereClause(q);
  const [cRow] = await prisma.$queryRaw<[{ c: bigint }]>(
    Prisma.sql`SELECT COUNT(*)::bigint AS c FROM "CreatorProfile" cp WHERE ${whereSql}`
  );
  const total = Number(cRow?.c ?? 0n);
  const rows = await prisma.$queryRaw<Array<{ id: string; slug: string; headline: string; bio: string }>>`
    SELECT id, slug, headline, bio FROM "CreatorProfile" cp
    WHERE ${whereSql}
    ORDER BY ts_rank_cd(cp."searchVector", plainto_tsquery('english', ${q})) DESC
    OFFSET ${offset} LIMIT ${limit}
  `;
  return {
    results: rows.map((c) => ({
      type: "creator" as const,
      id: c.id,
      slug: c.slug,
      title: c.slug,
      excerpt: (c.headline || c.bio).slice(0, 120),
    })),
    total,
    page,
    limit,
  };
}

export async function listProjectCollaborationIntents(params: {
  projectId: string;
  status?: ReviewStatus | "all";
  page: number;
  limit: number;
}): Promise<Paginated<CollaborationIntent>> {
  if (useMockData) {
    const filtered = mockCollaborationIntents.filter((item) => {
      const projectMatch = item.projectId === params.projectId;
      const statusMatch = !params.status || params.status === "all" || item.status === params.status;
      return projectMatch && statusMatch;
    });

    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where = {
    AND: [
      { projectId: params.projectId },
      params.status && params.status !== "all" ? { status: params.status } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.collaborationIntent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.collaborationIntent.count({ where }),
  ]);

  return {
    items: items.map(toCollaborationIntentDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

async function notifyProjectOwnerOfNewCollaborationIntent(params: {
  projectId: string;
  intentId: string;
  applicantId: string;
}): Promise<void> {
  if (useMockData) {
    const applicantName = userNameById(params.applicantId);
    const project = mockProjects.find((p) => p.id === params.projectId);
    if (!project) return;
    const creator = mockCreators.find((c) => c.id === project.creatorId);
    if (!creator || creator.userId === params.applicantId) return;
    void notifyUser({
      userId: creator.userId,
      kind: "project_intent_received",
      title: "New collaboration intent",
      body: `${applicantName} submitted a collaboration intent on “${project.title}”.`,
      metadata: { projectSlug: project.slug, intentId: params.intentId },
    });
    return;
  }
  const prisma = await getPrisma();
  const applicant = await prisma.user.findUnique({ where: { id: params.applicantId }, select: { name: true } });
  const applicantName = applicant?.name ?? "Someone";
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: { creator: { select: { userId: true } } },
  });
  if (!project || project.creator.userId === params.applicantId) return;
  void notifyUser({
    userId: project.creator.userId,
    kind: "project_intent_received",
    title: "New collaboration intent",
    body: `${applicantName} submitted a collaboration intent on “${project.title}”.`,
    metadata: { projectSlug: project.slug, intentId: params.intentId },
  });
}

/** T-4 alias: submit by applicant, checks creator profile + duplicate */
export async function submitCollaborationIntent(input: {
  projectId: string;
  applicantId: string;
  intentType: CollaborationIntentType;
  message: string;
  contact?: string;
}): Promise<CollaborationIntent> {
  // Verify applicant has a creator profile
  const profile = useMockData
    ? mockCreators.find((c) => c.userId === input.applicantId)
    : await (await getPrisma()).creatorProfile.findUnique({ where: { userId: input.applicantId } });
  if (!profile) {
    throw new RepositoryError(
      "CREATOR_PROFILE_REQUIRED",
      "A creator profile is required to submit collaboration intents",
      403
    );
  }

  // Prevent duplicate pending/approved intents
  if (useMockData) {
    const dup = mockCollaborationIntents.find(
      (i) => i.projectId === input.projectId && i.applicantId === input.applicantId && i.status !== "rejected"
    );
    if (dup) throw new Error("DUPLICATE_INTENT");
  } else {
    const prisma = await getPrisma();
    const dup = await prisma.collaborationIntent.findFirst({
      where: { projectId: input.projectId, applicantId: input.applicantId, status: { not: "rejected" } },
    });
    if (dup) throw new Error("DUPLICATE_INTENT");
  }

  const intent = await createCollaborationIntent(input);
  await notifyProjectOwnerOfNewCollaborationIntent({
    projectId: input.projectId,
    intentId: intent.id,
    applicantId: input.applicantId,
  });
  return intent;
}

export async function createCollaborationIntent(input: {
  projectId: string;
  applicantId: string;
  intentType: CollaborationIntentType;
  message: string;
  contact?: string;
}): Promise<CollaborationIntent> {
  const message = input.message.trim();
  const contact = input.contact?.trim();

  if (useMockData) {
    const projectExists = mockProjects.some((project) => project.id === input.projectId);
    if (!projectExists) {
      throw new Error("PROJECT_NOT_FOUND");
    }
    const applicantExists = mockUsers.some((user) => user.id === input.applicantId);
    if (!applicantExists) {
      throw new Error("USER_NOT_FOUND");
    }

    const intent: CollaborationIntent = {
      id: `ci_${Date.now()}`,
      projectId: input.projectId,
      applicantId: input.applicantId,
      intentType: input.intentType,
      message,
      contact: contact || undefined,
      status: "pending",
      convertedToTeamMembership: false,
      createdAt: new Date().toISOString(),
    };
    mockCollaborationIntents.unshift(intent);
    mockAuditLogs.unshift({
      id: `log_${Date.now()}`,
      actorId: input.applicantId,
      action: "collaboration_intent_created",
      entityType: "collaboration_intent",
      entityId: intent.id,
      metadata: {
        projectId: input.projectId,
        intentType: input.intentType,
      },
      createdAt: new Date().toISOString(),
    });
    return intent;
  }

  const prisma = await getPrisma();
  const createdIntent = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const [project, user] = await Promise.all([
      tx.project.findUnique({
        where: { id: input.projectId },
        select: { id: true },
      }),
      tx.user.findUnique({
        where: { id: input.applicantId },
        select: { id: true },
      }),
    ]);

    if (!project) {
      throw new Error("PROJECT_NOT_FOUND");
    }
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const intent = await tx.collaborationIntent.create({
      data: {
        projectId: input.projectId,
        applicantId: input.applicantId,
        intentType: input.intentType,
        message,
        contact: contact || null,
        status: "pending",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.applicantId,
        action: "collaboration_intent_created",
        entityType: "collaboration_intent",
        entityId: intent.id,
        metadata: {
          projectId: input.projectId,
          intentType: input.intentType,
        },
      },
    });

    return intent;
  });

  return toCollaborationIntentDto(createdIntent);
}

export async function listCollaborationIntentsForModeration(params: {
  status?: ReviewStatus | "all";
  projectId?: string;
  page: number;
  limit: number;
}): Promise<Paginated<CollaborationIntent>> {
  if (useMockData) {
    const filtered = mockCollaborationIntents.filter((item) => {
      const statusMatch = !params.status || params.status === "all" || item.status === params.status;
      const projectMatch = !params.projectId || item.projectId === params.projectId;
      return statusMatch && projectMatch;
    });
    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where = {
    AND: [
      params.status && params.status !== "all" ? { status: params.status } : {},
      params.projectId ? { projectId: params.projectId } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.collaborationIntent.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.collaborationIntent.count({ where }),
  ]);

  return {
    items: items.map(toCollaborationIntentDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function reviewCollaborationIntent(
  input: ReviewCollaborationIntentInput
): Promise<CollaborationIntent> {
  const nextStatus: ReviewStatus = input.action === "approve" ? "approved" : "rejected";
  const note = normalizeModerationNote(input.note);

  if (useMockData) {
    const intent = mockCollaborationIntents.find((item) => item.id === input.intentId);
    if (!intent) {
      throw new Error("COLLABORATION_INTENT_NOT_FOUND");
    }
    const wasApprovedMock = intent.status === "approved";
    if (input.projectOwnerUserId) {
      const project = mockProjects.find((p) => p.id === intent.projectId);
      const creator = project ? mockCreators.find((c) => c.id === project.creatorId) : null;
      if (!creator || creator.userId !== input.projectOwnerUserId) {
        throw new Error("FORBIDDEN_NOT_PROJECT_OWNER");
      }
    }

    intent.status = nextStatus;
    intent.reviewNote = note;
    intent.reviewedAt = new Date().toISOString();
    intent.reviewedBy = input.adminUserId;

    mockAuditLogs.unshift({
      id: `log_${Date.now()}`,
      actorId: input.adminUserId,
      action: `collaboration_intent_${nextStatus}`,
      entityType: "collaboration_intent",
      entityId: input.intentId,
      metadata: { note, inviteApplicantToTeamOnApprove: input.inviteApplicantToTeamOnApprove },
      createdAt: new Date().toISOString(),
    });

    const project = mockProjects.find((p) => p.id === intent.projectId);
    const projectSlug = project?.slug ?? intent.projectId;
    const projectTitle = project?.title ?? "the project";
    let joinedTeamSlug: string | undefined;

    if (nextStatus === "approved" && input.inviteApplicantToTeamOnApprove && intent.intentType === "join" && project?.teamId) {
      const team = mockTeams.find((t) => t.id === project.teamId);
      if (team) {
        const memberCount = mockTeamMemberships.filter((m) => m.teamId === team.id).length;
        const tier = await getUserTier(team.ownerUserId);
        const gate = checkTeamMemberLimit(tier, memberCount);
        const alreadyMember = mockTeamMemberships.some((m) => m.teamId === team.id && m.userId === intent.applicantId);
        if (gate.allowed && !alreadyMember) {
          mockTeamMemberships.push({
            id: `tm_admin_${Date.now()}`,
            teamId: team.id,
            userId: intent.applicantId,
            role: "member",
            joinedAt: new Date().toISOString(),
          });
          intent.convertedToTeamMembership = true;
          joinedTeamSlug = team.slug;
        }
      }
    }

    void notifyUser({
      userId: intent.applicantId,
      kind: "collaboration_intent_status_update",
      title: nextStatus === "approved" ? "Collaboration intent approved" : "Collaboration intent update",
      body:
        nextStatus === "approved"
          ? joinedTeamSlug
            ? `Your join request for “${projectTitle}” was approved and you were added to team /teams/${joinedTeamSlug}.`
            : `Your collaboration intent for “${projectTitle}” was approved.`
          : `Your collaboration intent for “${projectTitle}” was not approved.`,
      metadata: {
        projectSlug,
        status: nextStatus,
        source: "admin",
        teamSlug: joinedTeamSlug,
        convertedToTeamMembership: Boolean(joinedTeamSlug),
      },
    });

    if (nextStatus === "approved" && !wasApprovedMock) {
      void incrementContributionCreditField({
        userId: intent.applicantId,
        useMockData: true,
        deltaScore: contributionWeights.intentApproved,
        field: "intentsApproved",
      });
    }

    return intent;
  }

  const prisma = await getPrisma();
  const beforeIntent = await prisma.collaborationIntent.findUnique({
    where: { id: input.intentId },
    select: { applicantId: true, status: true },
  });
  if (!beforeIntent) {
    throw new Error("COLLABORATION_INTENT_NOT_FOUND");
  }
  const shouldCreditIntentApprove = beforeIntent.status !== "approved" && nextStatus === "approved";

  const updatedIntent = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const intent = await tx.collaborationIntent.findUnique({
      where: { id: input.intentId },
      include: {
        project: {
          select: {
            slug: true,
            title: true,
            teamId: true,
            creator: { select: { userId: true } },
            team: { select: { id: true, slug: true, ownerUserId: true } },
          },
        },
      },
    });
    if (!intent) {
      throw new Error("COLLABORATION_INTENT_NOT_FOUND");
    }
    if (input.projectOwnerUserId) {
      if (intent.project.creator.userId !== input.projectOwnerUserId) {
        throw new Error("FORBIDDEN_NOT_PROJECT_OWNER");
      }
    }

    let joinedTeamSlug: string | undefined;
    if (nextStatus === "approved" && input.inviteApplicantToTeamOnApprove && intent.intentType === "join" && intent.project.team) {
      const team = intent.project.team;
      const memberCount = await tx.teamMembership.count({ where: { teamId: team.id } });
      const tier = await getUserTier(team.ownerUserId);
      const gate = checkTeamMemberLimit(tier, memberCount);
      const alreadyMember = await tx.teamMembership.findUnique({
        where: { teamId_userId: { teamId: team.id, userId: intent.applicantId } },
      });
      if (gate.allowed && !alreadyMember) {
        await tx.teamMembership.create({
          data: { teamId: team.id, userId: intent.applicantId, role: "member" },
        });
        joinedTeamSlug = team.slug;
      }
    }

    const updated = await tx.collaborationIntent.update({
      where: { id: input.intentId },
      data: {
        status: nextStatus,
        reviewNote: note ?? null,
        reviewedAt: new Date(),
        reviewedBy: input.adminUserId,
        ...(joinedTeamSlug ? { convertedToTeamMembership: true } : {}),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.adminUserId,
        action: `collaboration_intent_${nextStatus}`,
        entityType: "collaboration_intent",
        entityId: input.intentId,
        metadata: { note, inviteApplicantToTeamOnApprove: input.inviteApplicantToTeamOnApprove, joinedTeamSlug },
      },
    });

    return { updated, project: intent.project, joinedTeamSlug };
  });

  const { updated, project, joinedTeamSlug } = updatedIntent;

  void notifyUser({
    userId: updated.applicantId,
    kind: "collaboration_intent_status_update",
    title: nextStatus === "approved" ? "Collaboration intent approved" : "Collaboration intent update",
    body:
      nextStatus === "approved"
        ? joinedTeamSlug
          ? `Your join request for “${project.title}” was approved and you were added to team /teams/${joinedTeamSlug}.`
          : `Your collaboration intent for “${project.title}” was approved.`
        : `Your collaboration intent for “${project.title}” was not approved.`,
    metadata: {
      projectSlug: project.slug,
      status: nextStatus,
      source: "admin",
      teamSlug: joinedTeamSlug,
      convertedToTeamMembership: Boolean(joinedTeamSlug),
    },
  });

  if (shouldCreditIntentApprove) {
    void incrementContributionCreditField({
      userId: beforeIntent.applicantId,
      useMockData: false,
      deltaScore: contributionWeights.intentApproved,
      field: "intentsApproved",
    });
  }

  return toCollaborationIntentDto(updated);
}

export async function reviewPost(input: ReviewPostInput): Promise<Post> {
  const nextStatus: ReviewStatus = input.action === "approve" ? "approved" : "rejected";
  const note = normalizeModerationNote(input.note);

  if (useMockData) {
    const post = mockPosts.find((item) => item.id === input.postId);
    if (!post) {
      throw new Error("POST_NOT_FOUND");
    }

    post.reviewStatus = nextStatus;
    post.reviewedAt = new Date().toISOString();
    post.reviewedBy = input.adminUserId;
    post.moderationNote = note;

    const existingCase = mockModerationCases.find(
      (item) => item.targetId === input.postId && item.status === "pending"
    );
    if (existingCase) {
      existingCase.status = nextStatus;
      existingCase.note = note;
      existingCase.resolvedAt = new Date().toISOString();
      existingCase.resolvedBy = input.adminUserId;
    } else {
      mockModerationCases.unshift({
        id: `mc_${Date.now()}`,
        targetType: "post",
        targetId: input.postId,
        status: nextStatus,
        reason: "manual_review",
        note,
        createdAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
        resolvedBy: input.adminUserId,
      });
    }

    mockReportTickets
      .filter((ticket) => ticket.targetId === input.postId && ticket.status === "open")
      .forEach((ticket) => {
        ticket.status = "closed";
        ticket.resolvedAt = new Date().toISOString();
        ticket.resolvedBy = input.adminUserId;
      });

    mockAuditLogs.unshift({
      id: `log_${Date.now()}`,
      actorId: input.adminUserId,
      action: `post_${nextStatus}`,
      entityType: "post",
      entityId: input.postId,
      metadata: { note },
      createdAt: new Date().toISOString(),
    });

    if (nextStatus === "approved") {
      void incrementContributionCreditField({
        userId: post.authorId,
        useMockData: true,
        deltaScore: contributionWeights.postApproved,
        field: "postsAuthored",
      });
    }

    return post;
  }

  const prisma = await getPrisma();
  const before = await prisma.post.findUnique({
    where: { id: input.postId },
    select: { authorId: true, reviewStatus: true },
  });
  if (!before) {
    throw new Error("POST_NOT_FOUND");
  }
  const shouldCreditApprove = before.reviewStatus !== "approved" && nextStatus === "approved";

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const post = await tx.post.findUnique({
      where: { id: input.postId },
    });
    if (!post) {
      throw new Error("POST_NOT_FOUND");
    }

    const updatedPost = await tx.post.update({
      where: { id: input.postId },
      data: {
        reviewStatus: nextStatus,
        moderationNote: note ?? null,
        reviewedAt: new Date(),
        reviewedBy: input.adminUserId,
      },
    });

    const pendingCases = await tx.moderationCase.findMany({
      where: {
        targetType: "post",
        targetId: input.postId,
        status: "pending",
      },
      select: { id: true },
    });

    if (pendingCases.length > 0) {
      const pendingCaseIds = pendingCases.map((item: { id: string }) => item.id);
      await tx.moderationCase.updateMany({
        where: { id: { in: pendingCaseIds } },
        data: {
          status: nextStatus,
          note: note ?? null,
          resolvedAt: new Date(),
          resolvedBy: input.adminUserId,
        },
      });
    } else {
      await tx.moderationCase.create({
        data: {
          targetType: "post",
          targetId: input.postId,
          postId: input.postId,
          status: nextStatus,
          reason: "manual_review",
          note: note ?? null,
          resolvedAt: new Date(),
          resolvedBy: input.adminUserId,
        },
      });
    }

    await tx.reportTicket.updateMany({
      where: {
        targetType: "post",
        targetId: input.postId,
        status: "open",
      },
      data: {
        status: "closed",
        resolvedAt: new Date(),
        resolvedBy: input.adminUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.adminUserId,
        action: `post_${nextStatus}`,
        entityType: "post",
        entityId: input.postId,
        metadata: { note },
      },
    });

    return updatedPost;
  });

  if (shouldCreditApprove) {
    void incrementContributionCreditField({
      userId: before.authorId,
      useMockData: false,
      deltaScore: contributionWeights.postApproved,
      field: "postsAuthored",
    });
  }

  return toPostDto(updated);
}

export async function listModerationCases(params: {
  status?: ReviewStatus | "all";
  page: number;
  limit: number;
}): Promise<Paginated<ModerationCase>> {
  if (useMockData) {
    const filtered = mockModerationCases.filter((item) => {
      return !params.status || params.status === "all" || item.status === params.status;
    });
    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where = params.status && params.status !== "all" ? { status: params.status } : {};
  const [items, total] = await Promise.all([
    prisma.moderationCase.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.moderationCase.count({ where }),
  ]);

  return {
    items: items.map(toModerationCaseDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function listReportTickets(params: {
  status?: "open" | "closed" | "all";
  page: number;
  limit: number;
}): Promise<Paginated<ReportTicket>> {
  if (useMockData) {
    const filtered = mockReportTickets.filter((item) => {
      return !params.status || params.status === "all" || item.status === params.status;
    });
    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where = params.status && params.status !== "all" ? { status: params.status } : {};
  const [items, total] = await Promise.all([
    prisma.reportTicket.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.reportTicket.count({ where }),
  ]);

  return {
    items: items.map(toReportTicketDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function listAuditLogs(params: {
  actorId?: string;
  page: number;
  limit: number;
}): Promise<Paginated<AuditLog>> {
  if (useMockData) {
    const filtered = mockAuditLogs.filter((item) => {
      return !params.actorId || item.actorId === params.actorId;
    });
    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where = params.actorId ? { actorId: params.actorId } : {};
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map(toAuditLogDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

// ─── Enterprise Verification ─────────────────────────────────────────────────


function toEnterpriseVerificationApplicationFromProfile(row: {
  id: string;
  email: string;
  enterpriseProfile?: {
    status: "none" | "pending" | "approved" | "rejected";
    organization: string | null;
    website: string | null;
    useCase: string | null;
    reviewedBy: string | null;
    reviewNote: string | null;
    appliedAt: Date | null;
    reviewedAt: Date | null;
  } | null;
}): EnterpriseVerificationApplication | null {
  const ep = row.enterpriseProfile;
  if (!ep || ep.status === "none") return null;
  const status = ep.status as Exclude<EnterpriseVerificationStatus, "none">;
  return {
    id: `eva_user_${row.id}`,
    userId: row.id,
    organizationName: ep.organization ?? "",
    organizationWebsite: ep.website ?? "",
    workEmail: row.email,
    useCase: ep.useCase ?? undefined,
    status,
    reviewNote: ep.reviewNote ?? undefined,
    reviewedBy: ep.reviewedBy ?? undefined,
    reviewedAt: ep.reviewedAt?.toISOString(),
    createdAt: (ep.appliedAt ?? new Date()).toISOString(),
    updatedAt: (ep.reviewedAt ?? ep.appliedAt ?? new Date()).toISOString(),
  };
}

export async function getEnterpriseProfileByUserId(userId: string): Promise<EnterpriseProfile | null> {
  return getEnterpriseProfileByUserIdFromDomain(userId);
}

export async function submitEnterpriseVerification(params: {
  userId: string;
  organizationName: string;
  organizationWebsite: string;
  workEmail: string;
  useCase?: string;
}): Promise<EnterpriseProfile> {
  return submitEnterpriseVerificationFromDomain(params);
}

export async function listEnterpriseProfiles(params: {
  status?: EnterpriseVerificationStatus | "all";
  page: number;
  limit: number;
}): Promise<Paginated<EnterpriseProfile>> {
  return listEnterpriseProfilesFromDomain(params);
}

export async function reviewEnterpriseVerification(params: {
  userId: string;
  adminUserId: string;
  action: "approve" | "reject";
  reviewNote?: string;
}): Promise<EnterpriseProfile> {
  return reviewEnterpriseVerificationFromDomain(params);
}

export function listCollectionTopics(): CollectionTopic[] {
  return COLLECTION_TOPICS.map((topic) => ({
    slug: topic.slug,
    title: topic.title,
    description: topic.description,
    tag: topic.tag,
  }));
}

export async function getTopicDiscovery(slug: string): Promise<{
  topic: CollectionTopic;
  posts: Paginated<Post>;
  projects: Paginated<Project>;
} | null> {
  const config = COLLECTION_TOPICS.find((item) => item.slug === slug);
  if (!config) {
    return null;
  }

  const topic: CollectionTopic = {
    slug: config.slug,
    title: config.title,
    description: config.description,
    tag: config.tag,
  };

  const [posts, projects] = await Promise.all([
    listPosts({ tag: config.tag, page: 1, limit: 12 }),
    listProjects({ tag: config.tag, page: 1, limit: 12 }),
  ]);

  return { topic, posts, projects };
}

export async function getDiscussionLeaderboard(limit: number): Promise<LeaderboardDiscussionRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  if (useMockData) {
    const approved = mockPosts.filter((p) => p.reviewStatus === "approved");
    const rows: LeaderboardDiscussionRow[] = approved.map((post) => ({
      postId: post.id,
      slug: post.slug,
      title: post.title,
      commentCount: mockComments.filter((c) => c.postId === post.id).length,
    }));
    rows.sort((a, b) => b.commentCount - a.commentCount || b.title.localeCompare(a.title));
    return rows.slice(0, safeLimit);
  }

  const prisma = await getPrisma();
  const rows = await prisma.$queryRaw<
    { id: string; slug: string; title: string; comment_count: bigint }[]
  >`
    SELECT p.id, p.slug, p.title, COUNT(c.id)::bigint AS comment_count
    FROM "Post" p
    LEFT JOIN "Comment" c ON c."postId" = p.id
    WHERE p."reviewStatus" = 'approved'
    GROUP BY p.id, p.slug, p.title
    ORDER BY COUNT(c.id) DESC, p.title ASC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    postId: row.id,
    slug: row.slug,
    title: row.title,
    commentCount: Number(row.comment_count),
  }));
}

export async function getProjectCollaborationLeaderboard(limit: number): Promise<LeaderboardProjectRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  if (useMockData) {
    const rows: LeaderboardProjectRow[] = mockProjects.map((project) => ({
      projectId: project.id,
      slug: project.slug,
      title: project.title,
      intentCount: mockCollaborationIntents.filter((i) => i.projectId === project.id).length,
    }));
    rows.sort((a, b) => b.intentCount - a.intentCount || a.title.localeCompare(b.title));
    return rows.slice(0, safeLimit);
  }

  const prisma = await getPrisma();
  const rows = await prisma.$queryRaw<
    { id: string; slug: string; title: string; intent_count: bigint }[]
  >`
    SELECT pr.id, pr.slug, pr.title, COUNT(ci.id)::bigint AS intent_count
    FROM "Project" pr
    LEFT JOIN "CollaborationIntent" ci ON ci."projectId" = pr.id
    GROUP BY pr.id, pr.slug, pr.title
    ORDER BY COUNT(ci.id) DESC, pr.title ASC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    projectId: row.id,
    slug: row.slug,
    title: row.title,
    intentCount: Number(row.intent_count),
  }));
}

export async function getWeeklyDiscussionLeaderboard(
  weekStart: Date,
  limit: number
): Promise<LeaderboardDiscussionRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const weekEnd = new Date(weekStart.getTime());
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  if (useMockData) {
    const approved = mockPosts.filter((p) => p.reviewStatus === "approved");
    const rows: LeaderboardDiscussionRow[] = approved.map((post) => ({
      postId: post.id,
      slug: post.slug,
      title: post.title,
      commentCount: mockComments.filter((c) => {
        if (c.postId !== post.id) {
          return false;
        }
        const t = new Date(c.createdAt).getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      }).length,
    }));
    rows.sort((a, b) => b.commentCount - a.commentCount || b.title.localeCompare(a.title));
    return rows.slice(0, safeLimit);
  }

  const prisma = await getPrisma();
  const rows = await prisma.$queryRaw<
    { id: string; slug: string; title: string; comment_count: bigint }[]
  >`
    SELECT p.id, p.slug, p.title, COUNT(c.id)::bigint AS comment_count
    FROM "Post" p
    LEFT JOIN "Comment" c ON c."postId" = p.id
      AND c."createdAt" >= ${weekStart}
      AND c."createdAt" < ${weekEnd}
    WHERE p."reviewStatus" = 'approved'
    GROUP BY p.id, p.slug, p.title
    ORDER BY COUNT(c.id) DESC, p.title ASC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    postId: row.id,
    slug: row.slug,
    title: row.title,
    commentCount: Number(row.comment_count),
  }));
}

export async function getWeeklyProjectCollaborationLeaderboard(
  weekStart: Date,
  limit: number
): Promise<LeaderboardProjectRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const weekEnd = new Date(weekStart.getTime());
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  if (useMockData) {
    const rows: LeaderboardProjectRow[] = mockProjects.map((project) => ({
      projectId: project.id,
      slug: project.slug,
      title: project.title,
      intentCount: mockCollaborationIntents.filter((i) => {
        if (i.projectId !== project.id) {
          return false;
        }
        const t = new Date(i.createdAt).getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      }).length,
    }));
    rows.sort((a, b) => b.intentCount - a.intentCount || a.title.localeCompare(b.title));
    return rows.slice(0, safeLimit);
  }

  const prisma = await getPrisma();
  const rows = await prisma.$queryRaw<
    { id: string; slug: string; title: string; intent_count: bigint }[]
  >`
    SELECT pr.id, pr.slug, pr.title, COUNT(ci.id)::bigint AS intent_count
    FROM "Project" pr
    LEFT JOIN "CollaborationIntent" ci ON ci."projectId" = pr.id
      AND ci."createdAt" >= ${weekStart}
      AND ci."createdAt" < ${weekEnd}
    GROUP BY pr.id, pr.slug, pr.title
    ORDER BY COUNT(ci.id) DESC, pr.title ASC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    projectId: row.id,
    slug: row.slug,
    title: row.title,
    intentCount: Number(row.intent_count),
  }));
}

export async function getMaterializedWeeklyLeaderboardSnapshot(
  weekStart: Date,
  kind: WeeklyLeaderboardKind
): Promise<WeeklyLeaderboardMaterializedSnapshot | null> {
  if (useMockData) {
    return mockWeeklySnapshots.get(weeklySnapshotKey(weekStart, kind)) ?? null;
  }

  const prisma = await getPrisma();
  const prismaKind =
    kind === "discussions_by_weekly_comment_count"
      ? "discussions_by_weekly_comment_count"
      : "projects_by_weekly_collaboration_intent_count";

  const snapshot = await prisma.weeklyLeaderboardSnapshot.findUnique({
    where: {
      weekStart_kind: { weekStart, kind: prismaKind },
    },
    include: {
      rows: { orderBy: { rank: "asc" } },
    },
  });

  if (!snapshot) {
    return null;
  }

  return {
    weekStart: snapshot.weekStart.toISOString(),
    generatedAt: snapshot.generatedAt.toISOString(),
    kind: snapshot.kind as WeeklyLeaderboardKind,
    rows: snapshot.rows.map((r) => ({
      rank: r.rank,
      entityId: r.entityId,
      slug: r.slug,
      title: r.title,
      score: r.score,
    })),
  };
}

export async function materializeWeeklyLeaderboardSnapshot(params: {
  weekStart: Date;
  kind: WeeklyLeaderboardKind;
  limit: number;
  actorId: string;
}): Promise<WeeklyLeaderboardMaterializedSnapshot> {
  const safeLimit = Math.min(Math.max(params.limit, 1), 50);
  const generatedAt = new Date();

  if (useMockData) {
    const discussionRows = await getWeeklyDiscussionLeaderboard(params.weekStart, safeLimit);
    const projectRows = await getWeeklyProjectCollaborationLeaderboard(params.weekStart, safeLimit);

    const rows: WeeklyLeaderboardMaterializedRow[] =
      params.kind === "discussions_by_weekly_comment_count"
        ? discussionRows.map((r, i) => ({
            rank: i + 1,
            entityId: r.postId,
            slug: r.slug,
            title: r.title,
            score: r.commentCount,
          }))
        : projectRows.map((r, i) => ({
            rank: i + 1,
            entityId: r.projectId,
            slug: r.slug,
            title: r.title,
            score: r.intentCount,
          }));

    const snapshot: WeeklyLeaderboardMaterializedSnapshot = {
      weekStart: params.weekStart.toISOString(),
      generatedAt: generatedAt.toISOString(),
      kind: params.kind,
      rows,
    };
    mockWeeklySnapshots.set(weeklySnapshotKey(params.weekStart, params.kind), snapshot);

    mockAuditLogs.unshift({
      id: `log_wk_${Date.now()}`,
      actorId: params.actorId,
      action: "weekly_leaderboard_materialized",
      entityType: "system",
      entityId: weeklySnapshotKey(params.weekStart, params.kind),
      metadata: {
        weekStart: params.weekStart.toISOString(),
        kind: params.kind,
        rowCount: rows.length,
      },
      createdAt: generatedAt.toISOString(),
    });

    return snapshot;
  }

  const prisma = await getPrisma();
  const prismaKind =
    params.kind === "discussions_by_weekly_comment_count"
      ? "discussions_by_weekly_comment_count"
      : "projects_by_weekly_collaboration_intent_count";

  const discussionRows = await getWeeklyDiscussionLeaderboard(params.weekStart, safeLimit);
  const projectRows = await getWeeklyProjectCollaborationLeaderboard(params.weekStart, safeLimit);

  const rowsPayload =
    params.kind === "discussions_by_weekly_comment_count"
      ? discussionRows.map((r, i) => ({
          rank: i + 1,
          entityId: r.postId,
          score: r.commentCount,
          slug: r.slug,
          title: r.title,
        }))
      : projectRows.map((r, i) => ({
          rank: i + 1,
          entityId: r.projectId,
          score: r.intentCount,
          slug: r.slug,
          title: r.title,
        }));

  const snapshot = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.weeklyLeaderboardSnapshot.deleteMany({
      where: { weekStart: params.weekStart, kind: prismaKind },
    });

    const created = await tx.weeklyLeaderboardSnapshot.create({
      data: {
        weekStart: params.weekStart,
        kind: prismaKind,
        generatedAt,
        rows: {
          create: rowsPayload,
        },
      },
      include: { rows: { orderBy: { rank: "asc" } } },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.actorId,
        action: "weekly_leaderboard_materialized",
        entityType: "system",
        entityId: `${prismaKind}:${params.weekStart.toISOString()}`,
        metadata: {
          weekStart: params.weekStart.toISOString(),
          kind: params.kind,
          rowCount: rowsPayload.length,
        },
      },
    });

    return created;
  });

  return {
    weekStart: snapshot.weekStart.toISOString(),
    generatedAt: snapshot.generatedAt.toISOString(),
    kind: snapshot.kind as WeeklyLeaderboardKind,
    rows: snapshot.rows.map((r) => ({
      rank: r.rank,
      entityId: r.entityId,
      slug: r.slug,
      title: r.title,
      score: r.score,
    })),
  };
}

export async function getWeeklyLeaderboardPublicPayload(params: {
  weekStart: Date;
  kind: WeeklyLeaderboardKind;
  limit: number;
}): Promise<WeeklyLeaderboardPublicPayload> {
  const safeLimit = Math.min(Math.max(params.limit, 1), 50);
  const materialized = await getMaterializedWeeklyLeaderboardSnapshot(params.weekStart, params.kind);
  if (materialized) {
    return {
      weekStart: materialized.weekStart,
      kind: materialized.kind,
      source: "materialized",
      generatedAt: materialized.generatedAt,
      rows: materialized.rows.slice(0, safeLimit),
    };
  }

  if (params.kind === "discussions_by_weekly_comment_count") {
    const live = await getWeeklyDiscussionLeaderboard(params.weekStart, safeLimit);
    return {
      weekStart: params.weekStart.toISOString(),
      kind: params.kind,
      source: "live",
      rows: live.map((r, i) => ({
        rank: i + 1,
        entityId: r.postId,
        slug: r.slug,
        title: r.title,
        score: r.commentCount,
      })),
    };
  }

  const live = await getWeeklyProjectCollaborationLeaderboard(params.weekStart, safeLimit);
  return {
    weekStart: params.weekStart.toISOString(),
    kind: params.kind,
    source: "live",
    rows: live.map((r, i) => ({
      rank: i + 1,
      entityId: r.projectId,
      slug: r.slug,
      title: r.title,
      score: r.intentCount,
    })),
  };
}

export async function getCollaborationIntentConversionMetrics(): Promise<CollaborationIntentConversionMetrics> {
  if (useMockData) {
    const totalSubmissions = mockCollaborationIntents.length;
    const pending = mockCollaborationIntents.filter((i) => i.status === "pending").length;
    const approved = mockCollaborationIntents.filter((i) => i.status === "approved").length;
    const rejected = mockCollaborationIntents.filter((i) => i.status === "rejected").length;
    const reviewed = approved + rejected;
    return {
      totalSubmissions,
      pending,
      approved,
      rejected,
      approvalRate: totalSubmissions === 0 ? 0 : approved / totalSubmissions,
      reviewedApprovalRate: reviewed === 0 ? 0 : approved / reviewed,
    };
  }

  const prisma = await getPrisma();
  const [totalSubmissions, pending, approved, rejected] = await Promise.all([
    prisma.collaborationIntent.count(),
    prisma.collaborationIntent.count({ where: { status: "pending" } }),
    prisma.collaborationIntent.count({ where: { status: "approved" } }),
    prisma.collaborationIntent.count({ where: { status: "rejected" } }),
  ]);

  const reviewed = approved + rejected;
  return {
    totalSubmissions,
    pending,
    approved,
    rejected,
    approvalRate: totalSubmissions === 0 ? 0 : approved / totalSubmissions,
    reviewedApprovalRate: reviewed === 0 ? 0 : approved / reviewed,
  };
}

export async function getEnterpriseWorkspaceSummary(params: {
  viewerUserId: string;
}): Promise<{
  pendingJoinRequests: Array<TeamJoinRequestRow & { teamSlug: string; teamName: string }>;
  funnel: CollaborationIntentConversionMetrics;
  teams: TeamSummary[];
}> {
  const [pendingJoinRequests, funnel, teams] = await Promise.all([
    listPendingJoinRequestsForOwner({ ownerUserId: params.viewerUserId }),
    getCollaborationIntentConversionMetrics(),
    listTeamsForUser(params.viewerUserId),
  ]);
  return { pendingJoinRequests, funnel, teams };
}

export async function getAdminOverview() {
  const collaborationIntentFunnel = await getCollaborationIntentConversionMetrics();

  if (useMockData) {
    const pendingPosts = mockPosts.filter((item) => item.reviewStatus === "pending").length;
    const openReports = mockReportTickets.filter((item) => item.status === "open").length;
    const moderationCases = mockModerationCases.filter((item) => item.status === "pending").length;
    const pendingCollaborationIntents = mockCollaborationIntents.filter(
      (item) => item.status === "pending"
    ).length;

    return {
      users: mockUsers.length,
      posts: mockPosts.length,
      pendingPosts,
      openReports,
      moderationCases,
      pendingCollaborationIntents,
      auditLogs: mockAuditLogs.length,
      collaborationIntentFunnel,
    };
  }

  const prisma = await getPrisma();
  const [users, posts, pendingPosts, openReports, moderationCases, pendingCollaborationIntents, auditLogs] =
    await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.post.count({ where: { reviewStatus: "pending" } }),
    prisma.reportTicket.count({ where: { status: "open" } }),
    prisma.moderationCase.count({ where: { status: "pending" } }),
    prisma.collaborationIntent.count({ where: { status: "pending" } }),
    prisma.auditLog.count(),
    ]);

  return {
    users,
    posts,
    pendingPosts,
    openReports,
    moderationCases,
    pendingCollaborationIntents,
    auditLogs,
    collaborationIntentFunnel,
  };
}

export async function getLatestEnterpriseVerificationApplication(
  userId: string
): Promise<EnterpriseVerificationApplication | null> {
  if (useMockData) {
    const profile = mockEnterpriseVerificationApplications.find((row) => row.userId === userId);
    if (!profile) return null;
    return {
      id: `eva_user_${profile.userId}`,
      userId: profile.userId,
      organizationName: profile.organizationName,
      organizationWebsite: profile.organizationWebsite,
      workEmail: profile.workEmail,
      useCase: profile.useCase ?? undefined,
      status: profile.status,
      reviewNote: profile.reviewNote ?? undefined,
      reviewedBy: profile.reviewedBy ?? undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
  const prisma = await getPrisma();
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      enterpriseProfile: { select: enterpriseProfileSelect },
    },
  });
  if (!row) return null;
  return toEnterpriseVerificationApplicationFromProfile(row);
}

export async function listTeams(params: { page: number; limit: number }): Promise<Paginated<TeamSummary>> {
  return listTeamsFromDomain(params);
}

export async function getTeamBySlug(slug: string, viewerUserId?: string | null): Promise<TeamDetail | null> {
  return getTeamBySlugFromDomain(slug, viewerUserId);
}

export async function createTeam(input: {
  ownerUserId: string;
  name: string;
  slug?: string;
  mission?: string;
}): Promise<TeamDetail> {
  return createTeamFromDomain(input);
}

// ─── T-1 + T-3: Update team links ────────────────────────────────────────────

export async function updateTeamLinks(params: {
  teamSlug: string;
  actorUserId: string;
  discordUrl?: string | null;
  telegramUrl?: string | null;
  slackUrl?: string | null;
  githubOrgUrl?: string | null;
  githubRepoUrl?: string | null;
}): Promise<TeamDetail> {
  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) throw new Error("TEAM_NOT_FOUND");
    if (team.ownerUserId !== params.actorUserId) throw new Error("FORBIDDEN_NOT_OWNER");
    if (params.discordUrl !== undefined) team.discordUrl = params.discordUrl ?? undefined;
    if (params.telegramUrl !== undefined) team.telegramUrl = params.telegramUrl ?? undefined;
    if (params.slackUrl !== undefined) team.slackUrl = params.slackUrl ?? undefined;
    if (params.githubOrgUrl !== undefined) team.githubOrgUrl = params.githubOrgUrl ?? undefined;
    if (params.githubRepoUrl !== undefined) team.githubRepoUrl = params.githubRepoUrl ?? undefined;
    const detail = await getTeamBySlug(params.teamSlug);
    if (!detail) throw new Error("TEAM_NOT_FOUND");
    return detail;
  }
  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({ where: { slug: params.teamSlug }, select: { id: true, ownerUserId: true } });
  if (!team) throw new Error("TEAM_NOT_FOUND");
  if (team.ownerUserId !== params.actorUserId) throw new Error("FORBIDDEN_NOT_OWNER");
  const data: Record<string, string | null> = {};
  if (params.discordUrl !== undefined) data.discordUrl = params.discordUrl;
  if (params.telegramUrl !== undefined) data.telegramUrl = params.telegramUrl;
  if (params.slackUrl !== undefined) data.slackUrl = params.slackUrl;
  if (params.githubOrgUrl !== undefined) data.githubOrgUrl = params.githubOrgUrl;
  if (params.githubRepoUrl !== undefined) data.githubRepoUrl = params.githubRepoUrl;
  await prisma.team.update({ where: { id: team.id }, data });
  const detail = await getTeamBySlug(params.teamSlug, params.actorUserId);
  if (!detail) throw new Error("TEAM_NOT_FOUND");
  return detail;
}

// ─── Team Chat ────────────────────────────────────────────────────────────────

const CHAT_RETAIN_DAYS = parseInt(process.env.CHAT_RETAIN_DAYS ?? "30", 10);

/** Returns the cutoff date for chat retention (now - CHAT_RETAIN_DAYS). */
export function chatRetentionCutoff(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - CHAT_RETAIN_DAYS);
  return d;
}

/**
 * Persist a chat message. Used by the REST fallback endpoint.
 * The WS server maintains its own in-memory history; this function
 * writes to the DB for durable history + cleanup.
 */
export async function createTeamChatMessage(input: {
  teamSlug: string;
  authorId: string;
  body: string;
}): Promise<TeamChatMessage> {
  const raw = input.body.trim();
  if (!raw || Buffer.byteLength(raw, "utf8") > 2000) throw new Error("INVALID_BODY");
  assertUrlCountAtMost(raw, 3, "chat");
  const body = escapeHtmlAngleBrackets(raw);

  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === input.teamSlug);
    if (!team) throw new Error("TEAM_NOT_FOUND");
    const author = mockUsers.find((u) => u.id === input.authorId);
    const msg = {
      id: `tcm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId: team.id,
      authorId: input.authorId,
      body,
      createdAt: new Date().toISOString(),
    };
    mockTeamChatMessages.unshift(msg);
    return {
      id: msg.id,
      teamId: team.id,
      teamSlug: input.teamSlug,
      authorId: input.authorId,
      authorName: author?.name ?? input.authorId,
      body,
      createdAt: msg.createdAt,
    };
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({ where: { slug: input.teamSlug }, select: { id: true, slug: true } });
  if (!team) throw new Error("TEAM_NOT_FOUND");
  const row = await prisma.teamChatMessage.create({
    data: { teamId: team.id, authorId: input.authorId, body },
    include: { author: { select: { name: true } } },
  });
  return {
    id:         row.id,
    teamId:     team.id,
    teamSlug:   team.slug,
    authorId:   row.authorId,
    authorName: row.author.name,
    body:       row.body,
    createdAt:  row.createdAt.toISOString(),
  };
}

/**
 * List the last N chat messages for a team, only those within the retention window.
 */
export async function listTeamChatMessages(input: {
  teamSlug: string;
  limit?: number;
}): Promise<TeamChatMessage[]> {
  const limit = Math.min(input.limit ?? 50, 200);
  const cutoff = chatRetentionCutoff();

  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === input.teamSlug);
    if (!team) throw new Error("TEAM_NOT_FOUND");
    return mockTeamChatMessages
      .filter((m) => m.teamId === team.id && new Date(m.createdAt) >= cutoff)
      .slice(0, limit)
      .map((m) => {
        const author = mockUsers.find((u) => u.id === m.authorId);
        return {
          id:         m.id,
          teamId:     team.id,
          teamSlug:   input.teamSlug,
          authorId:   m.authorId,
          authorName: author?.name ?? m.authorId,
          body:       m.body,
          createdAt:  m.createdAt,
        };
      });
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({ where: { slug: input.teamSlug }, select: { id: true, slug: true } });
  if (!team) throw new Error("TEAM_NOT_FOUND");
  const rows = await prisma.teamChatMessage.findMany({
    where: { teamId: team.id, createdAt: { gte: cutoff } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { author: { select: { name: true } } },
  });
  return rows.reverse().map((r) => ({
    id:         r.id,
    teamId:     team.id,
    teamSlug:   team.slug,
    authorId:   r.authorId,
    authorName: r.author.name,
    body:       r.body,
    createdAt:  r.createdAt.toISOString(),
  }));
}

/**
 * Delete chat messages older than CHAT_RETAIN_DAYS.
 * Returns the count of deleted rows.
 */
export async function pruneOldTeamChatMessages(): Promise<number> {
  const cutoff = chatRetentionCutoff();

  if (useMockData) {
    const before = mockTeamChatMessages.length;
    for (let i = mockTeamChatMessages.length - 1; i >= 0; i--) {
      if (new Date(mockTeamChatMessages[i].createdAt) < cutoff) {
        mockTeamChatMessages.splice(i, 1);
      }
    }
    return before - mockTeamChatMessages.length;
  }

  const prisma = await getPrisma();
  const { count } = await prisma.teamChatMessage.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return count;
}

// ─── T-4: Project-owner collaboration intent review ──────────────────────────

export async function reviewCollaborationIntentByOwner(params: {
  intentId: string;
  ownerUserId: string;
  action: "approve" | "reject";
  note?: string;
  /** If approve + teamSlug provided, auto-invite applicant to this team */
  inviteToTeamSlug?: string;
}): Promise<CollaborationIntent> {
  const nextStatus: ReviewStatus = params.action === "approve" ? "approved" : "rejected";
  const note = normalizeModerationNote(params.note);

  if (useMockData) {
    const intent = mockCollaborationIntents.find((i) => i.id === params.intentId);
    if (!intent) throw new Error("COLLABORATION_INTENT_NOT_FOUND");
    const wasApprovedOwner = intent.status === "approved";
    // Verify ownership via project
    const project = mockProjects.find((p) => p.id === intent.projectId);
    const creator = project ? mockCreators.find((c) => c.id === project.creatorId) : null;
    if (!creator || creator.userId !== params.ownerUserId) throw new Error("FORBIDDEN_NOT_PROJECT_OWNER");

    intent.status = nextStatus;
    intent.reviewNote = note;
    intent.reviewedAt = new Date().toISOString();
    intent.reviewedBy = params.ownerUserId;

    let joinedTeamSlug: string | undefined;
    if (nextStatus === "approved" && params.inviteToTeamSlug) {
      const team = mockTeams.find((t) => t.slug === params.inviteToTeamSlug);
      if (team && team.ownerUserId === params.ownerUserId) {
        const memberCount = mockTeamMemberships.filter((m) => m.teamId === team.id).length;
        const tier = await getUserTier(team.ownerUserId);
        const gate = checkTeamMemberLimit(tier, memberCount);
        const alreadyMember = mockTeamMemberships.some((m) => m.teamId === team.id && m.userId === intent.applicantId);
        if (gate.allowed && !alreadyMember) {
          mockTeamMemberships.push({
            id: `tm_conv_${Date.now()}`,
            teamId: team.id,
            userId: intent.applicantId,
            role: "member",
            joinedAt: new Date().toISOString(),
          });
          intent.convertedToTeamMembership = true;
          joinedTeamSlug = team.slug;
        }
      }
    }
    const projectSlug = project?.slug ?? intent.projectId;
    const projectTitle = project?.title ?? "the project";
    void notifyUser({
      userId: intent.applicantId,
      kind: "collaboration_intent_status_update",
      title: nextStatus === "approved" ? "Collaboration intent approved" : "Collaboration intent update",
      body:
        nextStatus === "approved"
          ? joinedTeamSlug
            ? `Your join request for “${projectTitle}” was approved — you’re now on team /teams/${joinedTeamSlug}.`
            : `Your collaboration intent for “${projectTitle}” was approved.`
          : `Your collaboration intent for “${projectTitle}” was not approved.`,
      metadata: {
        projectSlug,
        status: nextStatus,
        source: "project_owner",
        teamSlug: joinedTeamSlug,
        convertedToTeamMembership: Boolean(joinedTeamSlug),
      },
    });

    if (nextStatus === "approved" && !wasApprovedOwner) {
      void incrementContributionCreditField({
        userId: intent.applicantId,
        useMockData: true,
        deltaScore: contributionWeights.intentApproved,
        field: "intentsApproved",
      });
    }
    return intent;
  }

  const prisma = await getPrisma();
  const intent = await prisma.collaborationIntent.findUnique({
    where: { id: params.intentId },
    include: {
      project: {
        include: {
          creator: { select: { userId: true } },
          team: { select: { slug: true, id: true, ownerUserId: true } },
        },
      },
    },
  });
  if (!intent) throw new Error("COLLABORATION_INTENT_NOT_FOUND");
  if (intent.project.creator.userId !== params.ownerUserId) throw new Error("FORBIDDEN_NOT_PROJECT_OWNER");
  const wasApprovedOwnerDb = intent.status === "approved";

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const u = await tx.collaborationIntent.update({
      where: { id: params.intentId },
      data: { status: nextStatus, reviewNote: note ?? null, reviewedAt: new Date(), reviewedBy: params.ownerUserId },
    });
    let joinedTeamSlug: string | undefined;
    if (nextStatus === "approved" && params.inviteToTeamSlug) {
      const team = await tx.team.findFirst({ where: { slug: params.inviteToTeamSlug, ownerUserId: params.ownerUserId } });
      if (team) {
        const memberCount = await tx.teamMembership.count({ where: { teamId: team.id } });
        const tier = await getUserTier(team.ownerUserId);
        const gate = checkTeamMemberLimit(tier, memberCount);
        const alreadyMember = await tx.teamMembership.findUnique({ where: { teamId_userId: { teamId: team.id, userId: intent.applicantId } } });
        if (gate.allowed && !alreadyMember) {
          await tx.teamMembership.create({ data: { teamId: team.id, userId: intent.applicantId, role: "member" } });
          await tx.collaborationIntent.update({ where: { id: params.intentId }, data: { convertedToTeamMembership: true } });
          joinedTeamSlug = team.slug;
        }
      }
    }
    await tx.auditLog.create({
      data: {
        actorId: params.ownerUserId,
        action: `collaboration_intent_${nextStatus}_by_owner`,
        entityType: "collaboration_intent",
        entityId: params.intentId,
        metadata: { note, inviteToTeamSlug: params.inviteToTeamSlug },
      },
    });
    return { updated: u, project: intent.project, joinedTeamSlug };
  });
  void notifyUser({
    userId: result.updated.applicantId,
    kind: "collaboration_intent_status_update",
    title: nextStatus === "approved" ? "Collaboration intent approved" : "Collaboration intent update",
    body:
      nextStatus === "approved"
        ? result.joinedTeamSlug
          ? `Your join request for “${result.project.title}” was approved — you’re now on team /teams/${result.joinedTeamSlug}.`
          : `Your collaboration intent for “${result.project.title}” was approved.`
        : `Your collaboration intent for “${result.project.title}” was not approved.`,
    metadata: {
      projectSlug: result.project.slug,
      status: nextStatus,
      source: "project_owner",
      teamSlug: result.joinedTeamSlug,
      convertedToTeamMembership: Boolean(result.joinedTeamSlug),
    },
  });

  const updated = result.updated;

  if (nextStatus === "approved" && !wasApprovedOwnerDb) {
    void incrementContributionCreditField({
      userId: intent.applicantId,
      useMockData: false,
      deltaScore: contributionWeights.intentApproved,
      field: "intentsApproved",
    });
  }
  return {
    id: updated.id,
    projectId: updated.projectId,
    applicantId: updated.applicantId,
    intentType: updated.intentType as CollaborationIntentType,
    message: updated.message,
    contact: updated.contact ?? undefined,
    status: updated.status as ReviewStatus,
    reviewNote: updated.reviewNote ?? undefined,
    reviewedAt: updated.reviewedAt?.toISOString(),
    reviewedBy: updated.reviewedBy ?? undefined,
    convertedToTeamMembership: updated.convertedToTeamMembership,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function requestTeamJoin(params: {
  teamSlug: string;
  userId: string;
  message?: string;
}): Promise<TeamJoinRequestRow> {
  const message = params.message?.trim().slice(0, 500) ?? "";

  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) {
      throw new Error("TEAM_NOT_FOUND");
    }
    if (team.ownerUserId === params.userId) {
      throw new Error("TEAM_OWNER_NO_REQUEST");
    }
    const userExists = mockUsers.some((u) => u.id === params.userId);
    if (!userExists) {
      throw new Error("USER_NOT_FOUND");
    }
    const existingMember = mockTeamMemberships.find((m) => m.teamId === team.id && m.userId === params.userId);
    if (existingMember) {
      throw new Error("TEAM_ALREADY_MEMBER");
    }
    const existingPending = mockTeamJoinRequests.find(
      (r) => r.teamId === team.id && r.applicantId === params.userId && r.status === "pending"
    );
    if (existingPending) {
      throw new Error("TEAM_JOIN_REQUEST_PENDING");
    }
    const rejectedIdx = mockTeamJoinRequests.findIndex(
      (r) => r.teamId === team.id && r.applicantId === params.userId && r.status === "rejected"
    );
    const createdAt = new Date().toISOString();
    if (rejectedIdx >= 0) {
      const prev = mockTeamJoinRequests[rejectedIdx];
      mockTeamJoinRequests[rejectedIdx] = {
        ...prev,
        message,
        status: "pending",
        reviewedAt: undefined,
        createdAt,
      };
    mockAuditLogs.unshift({
      id: `log_tjr_${Date.now()}`,
      actorId: params.userId,
      action: "team_join_requested",
      entityType: "team_join_request",
      entityId: prev.id,
      metadata: { teamId: team.id, teamSlug: team.slug, reopened: true },
      createdAt,
    });
      void notifyUser({
        userId: team.ownerUserId,
        kind: "team_join_request",
        title: "新的入队申请",
        body: `${userNameById(params.userId)} 申请加入团队「${team.name}」（/${team.slug}）。`,
        metadata: { teamSlug: team.slug, requestId: prev.id },
      });
    void incrementContributionCreditField({
      userId: params.userId,
      useMockData: true,
      deltaScore: contributionWeights.joinRequest,
      field: "joinRequestsMade",
    });
    void dispatchWebhookEvent(params.userId, "team.join_requested", {
      teamSlug: team.slug,
      teamName: team.name,
      requestId: prev.id,
    });
    return toTeamJoinRequestRowMock(mockTeamJoinRequests[rejectedIdx]);
    }
    const row = {
      id: `tjr_${team.id}_${params.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      teamId: team.id,
      applicantId: params.userId,
      message,
      status: "pending" as const,
      createdAt,
    };
    mockTeamJoinRequests.push(row);
    mockAuditLogs.unshift({
      id: `log_tjr_${Date.now()}`,
      actorId: params.userId,
      action: "team_join_requested",
      entityType: "team_join_request",
      entityId: row.id,
      metadata: { teamId: team.id, teamSlug: team.slug },
      createdAt,
    });
    void notifyUser({
      userId: team.ownerUserId,
      kind: "team_join_request",
      title: "新的入队申请",
      body: `${userNameById(params.userId)} 申请加入团队「${team.name}」（/${team.slug}）。`,
      metadata: { teamSlug: team.slug, requestId: row.id },
    });
    void incrementContributionCreditField({
      userId: params.userId,
      useMockData: true,
      deltaScore: contributionWeights.joinRequest,
      field: "joinRequestsMade",
    });
    void dispatchWebhookEvent(params.userId, "team.join_requested", {
      teamSlug: team.slug,
      teamName: team.name,
      requestId: row.id,
    });
    return toTeamJoinRequestRowMock(row);
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({
    where: { slug: params.teamSlug },
    select: { id: true, ownerUserId: true },
  });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }
  if (team.ownerUserId === params.userId) {
    throw new Error("TEAM_OWNER_NO_REQUEST");
  }
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const existingMember = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: params.userId } },
  });
  if (existingMember) {
    throw new Error("TEAM_ALREADY_MEMBER");
  }

  const existingPending = await prisma.teamJoinRequest.findFirst({
    where: { teamId: team.id, applicantId: params.userId, status: "pending" },
  });
  if (existingPending) {
    throw new Error("TEAM_JOIN_REQUEST_PENDING");
  }

  const existingRejected = await prisma.teamJoinRequest.findFirst({
    where: { teamId: team.id, applicantId: params.userId, status: "rejected" },
  });

  try {
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const r = existingRejected
        ? await tx.teamJoinRequest.update({
            where: { id: existingRejected.id },
            data: {
              message,
              status: "pending",
              reviewedAt: null,
            },
            include: { applicant: { select: { id: true, name: true, email: true } } },
          })
        : await tx.teamJoinRequest.create({
            data: {
              teamId: team.id,
              applicantId: params.userId,
              message,
              status: "pending",
            },
            include: { applicant: { select: { id: true, name: true, email: true } } },
          });
      await tx.auditLog.create({
        data: {
          actorId: params.userId,
          action: "team_join_requested",
          entityType: "team_join_request",
          entityId: r.id,
          metadata: { teamId: team.id, reopened: Boolean(existingRejected) },
        },
      });
      return r;
    });
    const meta = await prisma.team.findUnique({
      where: { id: team.id },
      select: { slug: true, name: true },
    });
    void notifyUser({
      userId: team.ownerUserId,
      kind: "team_join_request",
      title: "新的入队申请",
      body: `${user.name} 申请加入团队「${meta?.name ?? ""}」（/${meta?.slug ?? params.teamSlug}）。`,
      metadata: { teamSlug: meta?.slug ?? params.teamSlug, requestId: created.id },
    });
    void incrementContributionCreditField({
      userId: params.userId,
      useMockData: false,
      deltaScore: contributionWeights.joinRequest,
      field: "joinRequestsMade",
    });
    void dispatchWebhookEvent(params.userId, "team.join_requested", {
      teamSlug: meta?.slug ?? params.teamSlug,
      teamName: meta?.name ?? "",
      requestId: created.id,
    });
    return {
      id: created.id,
      teamId: created.teamId,
      applicantId: created.applicant.id,
      applicantName: created.applicant.name,
      applicantEmail: created.applicant.email,
      message: created.message,
      status: created.status as TeamJoinRequestStatus,
      reviewedAt: created.reviewedAt?.toISOString(),
      createdAt: created.createdAt.toISOString(),
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("TEAM_JOIN_REQUEST_PENDING");
    }
    throw e;
  }
}

export async function reviewTeamJoinRequest(params: {
  teamSlug: string;
  requestId: string;
  ownerUserId: string;
  action: "approve" | "reject";
}): Promise<TeamJoinRequestRow> {
  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) {
      throw new Error("TEAM_NOT_FOUND");
    }
    if (team.ownerUserId !== params.ownerUserId) {
      throw new Error("FORBIDDEN_NOT_OWNER");
    }
    const idx = mockTeamJoinRequests.findIndex((r) => r.id === params.requestId && r.teamId === team.id);
    if (idx < 0) {
      throw new Error("JOIN_REQUEST_NOT_FOUND");
    }
    const req = mockTeamJoinRequests[idx];
    if (req.status !== "pending") {
      throw new Error("JOIN_REQUEST_NOT_PENDING");
    }
    const reviewedAt = new Date().toISOString();
    if (params.action === "reject") {
      mockTeamJoinRequests[idx] = { ...req, status: "rejected", reviewedAt };
      void notifyUser({
        userId: req.applicantId,
        kind: "team_join_rejected",
        title: "入队申请未通过",
        body: `队长未通过你加入「${team.name}」（/${team.slug}）的申请。`,
        metadata: { teamSlug: team.slug, requestId: req.id },
      });
      return toTeamJoinRequestRowMock(mockTeamJoinRequests[idx]);
    }
    const existingMember = mockTeamMemberships.find((m) => m.teamId === team.id && m.userId === req.applicantId);
    if (existingMember) {
      throw new Error("TEAM_ALREADY_MEMBER");
    }
    mockTeamJoinRequests[idx] = { ...req, status: "approved", reviewedAt };
    mockTeamMemberships.push({
      id: `tm_${team.id}_${req.applicantId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId: team.id,
      userId: req.applicantId,
      role: "member",
      joinedAt: reviewedAt,
    });
    mockAuditLogs.unshift({
      id: `log_tjr_review_${Date.now()}`,
      actorId: params.ownerUserId,
      action: "team_join_approved",
      entityType: "team_join_request",
      entityId: req.id,
      metadata: { teamId: team.id, applicantId: req.applicantId },
      createdAt: reviewedAt,
    });
    void notifyUser({
      userId: req.applicantId,
      kind: "team_join_approved",
      title: "已加入团队",
      body: `你已通过审批，加入团队「${team.name}」（/${team.slug}）。`,
      metadata: { teamSlug: team.slug, requestId: req.id },
    });
    void dispatchWebhookEvent(req.applicantId, "team.join_approved", {
      teamSlug: team.slug,
      teamName: team.name,
      requestId: req.id,
    });
    return toTeamJoinRequestRowMock(mockTeamJoinRequests[idx]);
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({
    where: { slug: params.teamSlug },
    select: { id: true, ownerUserId: true, name: true, slug: true },
  });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }
  if (team.ownerUserId !== params.ownerUserId) {
    throw new Error("FORBIDDEN_NOT_OWNER");
  }

  const req = await prisma.teamJoinRequest.findFirst({
    where: { id: params.requestId, teamId: team.id },
    include: { applicant: { select: { id: true, name: true, email: true } } },
  });
  if (!req) {
    throw new Error("JOIN_REQUEST_NOT_FOUND");
  }
  if (req.status !== "pending") {
    throw new Error("JOIN_REQUEST_NOT_PENDING");
  }

  if (params.action === "reject") {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const r = await tx.teamJoinRequest.update({
        where: { id: req.id },
        data: { status: "rejected", reviewedAt: new Date() },
        include: { applicant: { select: { id: true, name: true, email: true } } },
      });
      await tx.auditLog.create({
        data: {
          actorId: params.ownerUserId,
          action: "team_join_rejected",
          entityType: "team_join_request",
          entityId: r.id,
          metadata: { teamId: team.id, applicantId: r.applicantId },
        },
      });
      return r;
    });
    void notifyUser({
      userId: updated.applicantId,
      kind: "team_join_rejected",
      title: "入队申请未通过",
      body: `队长未通过你加入「${team.name}」（/${team.slug}）的申请。`,
      metadata: { teamSlug: team.slug, requestId: updated.id },
    });
    return {
      id: updated.id,
      teamId: updated.teamId,
      applicantId: updated.applicant.id,
      applicantName: updated.applicant.name,
      applicantEmail: updated.applicant.email,
      message: updated.message,
      status: updated.status as TeamJoinRequestStatus,
      reviewedAt: updated.reviewedAt?.toISOString(),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const r = await tx.teamJoinRequest.update({
      where: { id: req.id },
      data: { status: "approved", reviewedAt: new Date() },
      include: { applicant: { select: { id: true, name: true, email: true } } },
    });
    await tx.teamMembership.upsert({
      where: { teamId_userId: { teamId: team.id, userId: r.applicantId } },
      update: {},
      create: { teamId: team.id, userId: r.applicantId, role: "member" },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.ownerUserId,
        action: "team_join_approved",
        entityType: "team_join_request",
        entityId: r.id,
        metadata: { teamId: team.id, applicantId: r.applicantId },
      },
    });
    return r;
  });

  void notifyUser({
    userId: updated.applicantId,
    kind: "team_join_approved",
    title: "已加入团队",
    body: `你已通过审批，加入团队「${team.name}」（/${team.slug}）。`,
    metadata: { teamSlug: team.slug, requestId: updated.id },
  });
  void dispatchWebhookEvent(updated.applicantId, "team.join_approved", {
    teamSlug: team.slug,
    teamName: team.name,
    requestId: updated.id,
  });

  return {
    id: updated.id,
    teamId: updated.teamId,
    applicantId: updated.applicant.id,
    applicantName: updated.applicant.name,
    applicantEmail: updated.applicant.email,
    message: updated.message,
    status: updated.status as TeamJoinRequestStatus,
    reviewedAt: updated.reviewedAt?.toISOString(),
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function addTeamMemberByEmail(params: {
  teamSlug: string;
  actorUserId: string;
  email: string;
}): Promise<TeamMember> {
  const email = params.email.trim().toLowerCase();
  if (!email) {
    throw new Error("INVALID_EMAIL");
  }

  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) {
      throw new Error("TEAM_NOT_FOUND");
    }
    if (team.ownerUserId !== params.actorUserId) {
      throw new Error("FORBIDDEN_NOT_OWNER");
    }
    const target = mockUsers.find((u) => u.email.toLowerCase() === email);
    if (!target) {
      throw new Error("USER_NOT_FOUND");
    }
    const existing = mockTeamMemberships.find((m) => m.teamId === team.id && m.userId === target.id);
    if (existing) {
      throw new Error("TEAM_ALREADY_MEMBER");
    }
    const joinedAt = new Date().toISOString();
    mockTeamMemberships.push({
      id: `tm_${team.id}_${target.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId: team.id,
      userId: target.id,
      role: "member",
      joinedAt,
    });
    const now = joinedAt;
    for (let i = 0; i < mockTeamJoinRequests.length; i += 1) {
      const jr = mockTeamJoinRequests[i];
      if (jr.teamId === team.id && jr.applicantId === target.id && jr.status === "pending") {
        mockTeamJoinRequests[i] = { ...jr, status: "approved", reviewedAt: now };
      }
    }
    void dispatchWebhookEvent(team.ownerUserId, "team.member_joined", {
      teamId: team.id,
      teamSlug: team.slug,
      memberUserId: target.id,
      memberName: target.name,
    });
    return { userId: target.id, name: target.name, email: target.email, role: "member", joinedAt };
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({
    where: { slug: params.teamSlug },
    select: { id: true, ownerUserId: true, slug: true },
  });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }
  if (team.ownerUserId !== params.actorUserId) {
    throw new Error("FORBIDDEN_NOT_OWNER");
  }
  const target = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!target) {
    throw new Error("USER_NOT_FOUND");
  }

  try {
    const row = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const m = await tx.teamMembership.create({
        data: { teamId: team.id, userId: target.id, role: "member" },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      await tx.teamJoinRequest.updateMany({
        where: { teamId: team.id, applicantId: target.id, status: "pending" },
        data: { status: "approved", reviewedAt: new Date() },
      });
      return m;
    });
    void dispatchWebhookEvent(team.ownerUserId, "team.member_joined", {
      teamId: team.id,
      teamSlug: team.slug,
      memberUserId: target.id,
      memberName: row.user.name,
    });
    return {
      userId: row.user.id,
      name: row.user.name,
      email: row.user.email,
      role: "member",
      joinedAt: row.joinedAt.toISOString(),
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("TEAM_ALREADY_MEMBER");
    }
    throw e;
  }
}

export async function removeTeamMember(params: {
  teamSlug: string;
  actorUserId: string;
  memberUserId: string;
}): Promise<void> {
  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) {
      throw new Error("TEAM_NOT_FOUND");
    }
    const membership = mockTeamMemberships.find(
      (m) => m.teamId === team.id && m.userId === params.memberUserId
    );
    if (!membership) {
      throw new Error("MEMBERSHIP_NOT_FOUND");
    }
    if (membership.role === "owner") {
      throw new Error("CANNOT_REMOVE_OWNER");
    }
    const isOwner = team.ownerUserId === params.actorUserId;
    const isSelf = params.actorUserId === params.memberUserId;
    if (!isOwner && !isSelf) {
      throw new Error("FORBIDDEN");
    }
    const idx = mockTeamMemberships.findIndex(
      (m) => m.teamId === team.id && m.userId === params.memberUserId
    );
    if (idx >= 0) {
      mockTeamMemberships.splice(idx, 1);
    }
    return;
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({
    where: { slug: params.teamSlug },
    select: { id: true, ownerUserId: true },
  });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }

  const membership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: params.memberUserId } },
    select: { role: true },
  });
  if (!membership) {
    throw new Error("MEMBERSHIP_NOT_FOUND");
  }
  if (membership.role === "owner") {
    throw new Error("CANNOT_REMOVE_OWNER");
  }

  const isOwner = team.ownerUserId === params.actorUserId;
  const isSelf = params.actorUserId === params.memberUserId;
  if (!isOwner && !isSelf) {
    throw new Error("FORBIDDEN");
  }

  await prisma.teamMembership.delete({
    where: { teamId_userId: { teamId: team.id, userId: params.memberUserId } },
  });
}

function parseScopesFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((x): x is string => typeof x === "string");
}

function toApiKeySummary(row: {
  id: string;
  label: string;
  prefix: string;
  scopes?: unknown;
  createdAt: Date | string;
  lastUsedAt?: Date | string | null;
  revokedAt?: Date | string | null;
  expiresAt?: Date | string | null;
}): ApiKeySummary {
  const scopes =
    row.scopes !== undefined && row.scopes !== null
      ? parseScopesFromJson(row.scopes)
      : [...DEFAULT_API_KEY_SCOPES];
  return {
    id: row.id,
    label: row.label,
    prefix: row.prefix,
    scopes,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt
      ? typeof row.lastUsedAt === "string"
        ? row.lastUsedAt
        : row.lastUsedAt.toISOString()
      : undefined,
    revokedAt: row.revokedAt
      ? typeof row.revokedAt === "string"
        ? row.revokedAt
        : row.revokedAt.toISOString()
      : undefined,
    expiresAt: row.expiresAt
      ? typeof row.expiresAt === "string"
        ? row.expiresAt
        : row.expiresAt.toISOString()
      : undefined,
  };
}

export async function listApiKeysForUser(userId: string): Promise<ApiKeySummary[]> {
  if (useMockData) {
    return mockApiKeys
      .filter((k) => k.userId === userId)
      .map((k) => toApiKeySummary(k))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const prisma = await getPrisma();
  const rows = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => toApiKeySummary(r));
}

export async function createApiKeyForUser(params: {
  userId: string;
  label: string;
  scopes?: string[];
  /** Optional TTL in days from creation */
  expiresInDays?: number;
}): Promise<ApiKeyCreated> {
  const label = params.label.trim().slice(0, 80);
  if (!label) {
    throw new Error("INVALID_API_KEY_LABEL");
  }
  let expiresAt: Date | undefined;
  if (params.expiresInDays !== undefined) {
    const n = Math.floor(params.expiresInDays);
    if (!Number.isFinite(n) || n < 1 || n > 3650) {
      throw new Error("INVALID_API_KEY_EXPIRES_IN_DAYS");
    }
    expiresAt = new Date(Date.now() + n * 24 * 60 * 60 * 1000);
  }
  let scopes: string[];
  try {
    scopes = normalizeApiKeyScopes(params.scopes);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "INVALID_API_KEY_SCOPE") {
      throw new Error("INVALID_API_KEY_SCOPE");
    }
    if (msg === "API_KEY_SCOPE_READ_PUBLIC_REQUIRED") {
      throw new Error("API_KEY_SCOPE_READ_PUBLIC_REQUIRED");
    }
    throw e;
  }

  const { fullToken, prefix } = generateApiKeyPlaintext();
  const keyHash = hashApiKeyToken(fullToken);
  const now = new Date().toISOString();

  if (useMockData) {
    if (!mockUsers.some((u) => u.id === params.userId)) {
      throw new Error("USER_NOT_FOUND");
    }
    if (mockApiKeys.some((k) => k.keyHash === keyHash)) {
      throw new Error("API_KEY_HASH_COLLISION");
    }
    const id = `apk_${params.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    mockApiKeys.unshift({
      id,
      userId: params.userId,
      label,
      keyHash,
      prefix,
      scopes: [...scopes],
      createdAt: now,
      expiresAt: expiresAt?.toISOString(),
    });
    mockAuditLogs.unshift({
      id: `log_apk_${Date.now()}`,
      actorId: params.userId,
      action: "api_key_created",
      entityType: "api_key",
      entityId: id,
      metadata: { prefix, scopes },
      createdAt: now,
    });
    return { ...toApiKeySummary(mockApiKeys.find((k) => k.id === id)!), secret: fullToken };
  }

  const prisma = await getPrisma();
  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const row = await tx.apiKey.create({
      data: {
        userId: params.userId,
        label,
        keyHash,
        prefix,
        scopes,
        expiresAt: expiresAt ?? null,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.userId,
        action: "api_key_created",
        entityType: "api_key",
        entityId: row.id,
        metadata: { prefix, scopes },
      },
    });
    return row;
  });

  return { ...toApiKeySummary(created), secret: fullToken };
}

export async function listUserWebhooks(userId: string): Promise<WebhookEndpointSummary[]> {
  if (useMockData) {
    return mockWebhookEndpoints
      .filter((w) => w.userId === userId)
      .map((w) => ({
        id: w.id,
        url: w.url,
        events: [...w.events],
        active: w.active,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      }));
  }
  const prisma = await getPrisma();
  const rows = await prisma.webhookEndpoint.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map((w) => ({
    id: w.id,
    url: w.url,
    events: [...w.events],
    active: w.active,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  }));
}

export async function createUserWebhook(params: {
  userId: string;
  url: string;
  events: string[];
}): Promise<WebhookEndpointCreated> {
  const url = params.url.trim();
  if (!/^https:\/\//i.test(url)) throw new Error("INVALID_WEBHOOK_URL");
  assertPublicHttpsUrl(url);
  const rawEvents = params.events.map((e) => e.trim()).filter(Boolean);
  for (const e of rawEvents) {
    if (!isWebhookEventName(e)) throw new Error("INVALID_WEBHOOK_EVENT");
  }
  const events = rawEvents.length > 0 ? rawEvents : [...WEBHOOK_EVENT_NAMES];
  const secret = randomBytes(32).toString("hex");
  const now = new Date().toISOString();
  if (useMockData) {
    if (!mockUsers.some((u) => u.id === params.userId)) throw new Error("USER_NOT_FOUND");
    const id = `wh_${params.userId}_${Date.now()}_${randomBytes(4).toString("hex")}`;
    mockWebhookEndpoints.unshift({
      id,
      userId: params.userId,
      url,
      secret,
      events,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    const w = mockWebhookEndpoints[0]!;
    return {
      id: w.id,
      url: w.url,
      events: [...w.events],
      active: w.active,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      secret,
    };
  }
  const prisma = await getPrisma();
  const row = await prisma.webhookEndpoint.create({
    data: { userId: params.userId, url, secret, events, active: true },
  });
  return {
    id: row.id,
    url: row.url,
    events: [...row.events],
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    secret,
  };
}

export async function updateUserWebhook(params: {
  userId: string;
  webhookId: string;
  url?: string;
  events?: string[];
  active?: boolean;
}): Promise<WebhookEndpointSummary> {
  if (params.url !== undefined) {
    const u = params.url.trim();
    if (!/^https:\/\//i.test(u)) throw new Error("INVALID_WEBHOOK_URL");
    assertPublicHttpsUrl(u);
  }
  if (params.events) {
    for (const e of params.events) {
      if (!isWebhookEventName(e.trim())) throw new Error("INVALID_WEBHOOK_EVENT");
    }
  }
  const eventsUpdate =
    params.events === undefined ? undefined : params.events.length > 0 ? params.events.map((e) => e.trim()).filter(Boolean) : [...WEBHOOK_EVENT_NAMES];
  if (useMockData) {
    const idx = mockWebhookEndpoints.findIndex((w) => w.id === params.webhookId && w.userId === params.userId);
    if (idx < 0) throw new Error("WEBHOOK_NOT_FOUND");
    const w = mockWebhookEndpoints[idx]!;
    if (params.url !== undefined) w.url = params.url.trim();
    if (params.events !== undefined) {
      w.events = eventsUpdate!.length ? eventsUpdate! : [...WEBHOOK_EVENT_NAMES];
    }
    if (params.active !== undefined) w.active = params.active;
    w.updatedAt = new Date().toISOString();
    return {
      id: w.id,
      url: w.url,
      events: [...w.events],
      active: w.active,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    };
  }
  const prisma = await getPrisma();
  const existing = await prisma.webhookEndpoint.findFirst({
    where: { id: params.webhookId, userId: params.userId },
  });
  if (!existing) throw new Error("WEBHOOK_NOT_FOUND");
  const data: Prisma.WebhookEndpointUpdateInput = {};
  if (params.url !== undefined) data.url = params.url.trim();
  if (params.events !== undefined) data.events = eventsUpdate!;
  if (params.active !== undefined) data.active = params.active;
  const row = await prisma.webhookEndpoint.update({
    where: { id: existing.id },
    data,
  });
  return {
    id: row.id,
    url: row.url,
    events: [...row.events],
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listWebhookDeliveries(params: {
  userId?: string;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    userId: string;
    webhookEndpointId: string | null;
    event: string;
    targetUrl: string;
    status: string;
    httpStatus: number | null;
    errorMessage: string | null;
    attempts: number;
    createdAt: string;
  }>
> {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  if (useMockData) {
    return [];
  }
  const prisma = await getPrisma();
  const rows = await prisma.webhookDelivery.findMany({
    where: params.userId ? { userId: params.userId } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    webhookEndpointId: r.webhookEndpointId,
    event: r.event,
    targetUrl: r.targetUrl,
    status: r.status,
    httpStatus: r.httpStatus,
    errorMessage: r.errorMessage,
    attempts: r.attempts,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getUserWebhookSecret(params: { userId: string; webhookId: string }): Promise<string | null> {
  if (useMockData) {
    const w = mockWebhookEndpoints.find((x) => x.id === params.webhookId && x.userId === params.userId);
    return w?.secret ?? null;
  }
  const prisma = await getPrisma();
  const row = await prisma.webhookEndpoint.findFirst({
    where: { id: params.webhookId, userId: params.userId },
    select: { secret: true },
  });
  return row?.secret ?? null;
}

export async function testUserWebhook(params: {
  userId: string;
  webhookId: string;
}): Promise<{ ok: boolean; httpStatus?: number; error?: string }> {
  const secret = await getUserWebhookSecret(params);
  if (!secret) throw new Error("WEBHOOK_NOT_FOUND");
  if (useMockData) {
    const w = mockWebhookEndpoints.find((x) => x.id === params.webhookId && x.userId === params.userId);
    if (!w) throw new Error("WEBHOOK_NOT_FOUND");
    return { ok: true, httpStatus: 200 };
  }
  const prisma = await getPrisma();
  const ep = await prisma.webhookEndpoint.findFirst({
    where: { id: params.webhookId, userId: params.userId },
    select: { url: true },
  });
  if (!ep) throw new Error("WEBHOOK_NOT_FOUND");
  const { deliverWebhookHttp } = await import("@/lib/webhook-deliver-http");
  const bodyObj = {
    event: "in_app_notification",
    userId: params.userId,
    payload: { test: true },
    ts: new Date().toISOString(),
  };
  const body = JSON.stringify(bodyObj);
  const idem = `test_${params.webhookId}_${Date.now()}`;
  const result = await deliverWebhookHttp({
    userId: params.userId,
    event: "in_app_notification",
    body,
    targetUrl: ep.url,
    secret,
    idempotencyKey: idem,
    webhookEndpointId: params.webhookId,
  });
  return { ok: result.ok, httpStatus: result.httpStatus, error: result.error };
}

export async function deleteUserWebhook(params: { userId: string; webhookId: string }): Promise<void> {
  if (useMockData) {
    const idx = mockWebhookEndpoints.findIndex((w) => w.id === params.webhookId && w.userId === params.userId);
    if (idx < 0) throw new Error("WEBHOOK_NOT_FOUND");
    mockWebhookEndpoints.splice(idx, 1);
    return;
  }
  const prisma = await getPrisma();
  const existing = await prisma.webhookEndpoint.findFirst({
    where: { id: params.webhookId, userId: params.userId },
  });
  if (!existing) throw new Error("WEBHOOK_NOT_FOUND");
  await prisma.webhookEndpoint.delete({ where: { id: existing.id } });
}

export async function revokeApiKeyForUser(params: { userId: string; keyId: string }): Promise<void> {
  if (useMockData) {
    const idx = mockApiKeys.findIndex((k) => k.id === params.keyId && k.userId === params.userId);
    if (idx < 0) {
      throw new Error("API_KEY_NOT_FOUND");
    }
    if (mockApiKeys[idx].revokedAt) {
      throw new Error("API_KEY_NOT_FOUND");
    }
    const now = new Date().toISOString();
    mockApiKeys[idx].revokedAt = now;
    mockAuditLogs.unshift({
      id: `log_api_revoke_${Date.now()}`,
      actorId: params.userId,
      action: "api_key_revoked",
      entityType: "api_key",
      entityId: params.keyId,
      metadata: { keyId: params.keyId },
      createdAt: now,
    });
    return;
  }

  const prisma = await getPrisma();
  const key = await prisma.apiKey.findFirst({
    where: { id: params.keyId, userId: params.userId, revokedAt: null },
    select: { id: true },
  });
  if (!key) {
    throw new Error("API_KEY_NOT_FOUND");
  }
  await prisma.$transaction(async (tx) => {
    await tx.apiKey.update({
      where: { id: key.id },
      data: { revokedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.userId,
        action: "api_key_revoked",
        entityType: "api_key",
        entityId: key.id,
        metadata: { keyId: key.id },
      },
    });
  });
}

export async function getSessionUserFromApiKeyToken(plaintextToken: string): Promise<SessionUser | null> {
  if (!plaintextToken || !isApiKeyTokenFormat(plaintextToken)) {
    return null;
  }
  const keyHash = hashApiKeyToken(plaintextToken);

  if (useMockData) {
    const row = mockApiKeys.find((k) => k.keyHash === keyHash && !k.revokedAt);
    if (!row) {
      return null;
    }
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
      return null;
    }
    row.lastUsedAt = new Date().toISOString();
    const u = mockUsers.find((x) => x.id === row.userId);
    if (!u) {
      return null;
    }
    const scopeList = row.scopes?.length ? row.scopes : [...DEFAULT_API_KEY_SCOPES];
    return {
      userId: u.id,
      role: u.role,
      name: u.name,
      apiKeyScopes: scopeList,
      apiKeyId: row.id,
      enterpriseStatus: u.enterpriseStatus ?? "none",
      enterpriseOrganization: u.enterpriseOrganization ?? undefined,
      enterpriseWebsite: u.enterpriseWebsite ?? undefined,
    };
  }

  const prisma = await getPrisma();
  const row = await prisma.apiKey.findFirst({
    where: { keyHash, revokedAt: null },
    select: { id: true, userId: true, scopes: true, expiresAt: true },
  });
  if (!row) {
    return null;
  }
  if (row.expiresAt && row.expiresAt < new Date()) {
    return null;
  }
  await prisma.apiKey.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });
  const u = await prisma.user.findUnique({
    where: { id: row.userId },
    select: {
      id: true,
      name: true,
      role: true,
      enterpriseProfile: { select: enterpriseProfileSelect },
    },
  });
  if (!u) {
    return null;
  }
  const scopeList = parseScopesFromJson(row.scopes);
  const effectiveScopes = scopeList.length ? scopeList : [...DEFAULT_API_KEY_SCOPES];
  const subscriptionTier = await getUserTier(u.id);
  const ent = sessionEnterpriseFromProfile(u.enterpriseProfile ?? undefined);
  return {
    userId: u.id,
    role: u.role as Role,
    name: u.name,
    subscriptionTier,
    apiKeyScopes: effectiveScopes,
    apiKeyId: row.id,
    enterpriseStatus: ent.enterpriseStatus,
    enterpriseOrganization: ent.enterpriseOrganization,
    enterpriseWebsite: ent.enterpriseWebsite,
  };
}

export interface GitHubUserInput {
  githubId: number;
  githubUsername: string;
  email: string;
  name: string;
  avatarUrl: string;
}

export async function findOrCreateGitHubUser(input: GitHubUserInput): Promise<User> {
  if (useMockData) {
    let user = mockUsers.find((u) => u.githubId === input.githubId);
    if (user) {
      user.name = input.name;
      user.avatarUrl = input.avatarUrl;
      user.githubUsername = input.githubUsername;
      return user;
    }
    user = {
      id: `u-gh-${input.githubId}`,
      email: input.email,
      name: input.name,
      role: "user" as const,
      githubId: input.githubId,
      githubUsername: input.githubUsername,
      avatarUrl: input.avatarUrl,
    };
    mockUsers.push(user);
    return user;
  }

  const prisma = await getPrisma();
  const existing = await prisma.user.findUnique({ where: { githubId: input.githubId } });
  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        avatarUrl: input.avatarUrl,
        githubUsername: input.githubUsername,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        sessionVersion: true,
        githubId: true,
        githubUsername: true,
        avatarUrl: true,
        enterpriseProfile: { select: enterpriseProfileSelect },
      },
    });
    const ent = sessionEnterpriseFromProfile(updated.enterpriseProfile ?? undefined);
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role as Role,
      sessionVersion: updated.sessionVersion,
      githubId: updated.githubId ?? undefined,
      githubUsername: updated.githubUsername ?? undefined,
      avatarUrl: updated.avatarUrl ?? undefined,
      enterpriseStatus: ent.enterpriseStatus,
      enterpriseOrganization: ent.enterpriseOrganization,
      enterpriseWebsite: ent.enterpriseWebsite,
    };
  }

  const created = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: "user",
      githubId: input.githubId,
      githubUsername: input.githubUsername,
      avatarUrl: input.avatarUrl,
      enterpriseProfile: { create: { status: "none" } },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      sessionVersion: true,
      githubId: true,
      githubUsername: true,
      avatarUrl: true,
      enterpriseProfile: { select: enterpriseProfileSelect },
    },
  });
  const ent = sessionEnterpriseFromProfile(created.enterpriseProfile ?? undefined);
  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role: created.role as Role,
    sessionVersion: created.sessionVersion,
    githubId: created.githubId ?? undefined,
    githubUsername: created.githubUsername ?? undefined,
    avatarUrl: created.avatarUrl ?? undefined,
    enterpriseStatus: ent.enterpriseStatus,
    enterpriseOrganization: ent.enterpriseOrganization,
    enterpriseWebsite: ent.enterpriseWebsite,
  };
}

export function getDemoUser(role: DemoRole = "user") {
  const fallbackUser = mockUsers.find((item) => item.role === "user");
  const user =
    (role === "admin"
      ? mockUsers.find((item) => item.role === "admin")
      : mockUsers.find((item) => item.role === "user")) ?? fallbackUser;

  if (!user) {
    throw new Error("Demo user is not configured");
  }

  return {
    userId: user.id,
    role: user.role,
    name: user.name,
    sessionVersion: user.sessionVersion ?? 0,
    enterpriseStatus: user.enterpriseStatus ?? "none",
    enterpriseOrganization: user.enterpriseOrganization,
    enterpriseWebsite: user.enterpriseWebsite,
  };
}
export async function updateComment(params: {
  commentId: string;
  actorUserId: string;
  body: string;
}): Promise<Comment> {
  assertContentSafeText(params.body, "body");
  if (useMockData) {
    const comment = mockComments.find((c) => c.id === params.commentId);
    if (!comment) {
      throw new Error("COMMENT_NOT_FOUND");
    }
    if (comment.authorId !== params.actorUserId) {
      throw new Error("FORBIDDEN_NOT_AUTHOR");
    }
    comment.body = params.body;
    return { ...comment };
  }

  const prisma = await getPrisma();
  const comment = await prisma.comment.findUnique({ where: { id: params.commentId } });
  if (!comment) {
    throw new Error("COMMENT_NOT_FOUND");
  }
  if (comment.authorId !== params.actorUserId) {
    throw new Error("FORBIDDEN_NOT_AUTHOR");
  }
  const updated = await prisma.comment.update({
    where: { id: params.commentId },
    data: { body: params.body },
  });
  return toCommentDto(updated);
}

export async function deleteComment(params: {
  commentId: string;
  actorUserId: string;
  actorRole: Role;
}): Promise<void> {
  if (useMockData) {
    const idx = mockComments.findIndex((c) => c.id === params.commentId);
    if (idx === -1) {
      throw new Error("COMMENT_NOT_FOUND");
    }
    if (mockComments[idx].authorId !== params.actorUserId && params.actorRole !== "admin") {
      throw new Error("FORBIDDEN_NOT_AUTHOR");
    }
    mockComments.splice(idx, 1);
    return;
  }

  const prisma = await getPrisma();
  const comment = await prisma.comment.findUnique({ where: { id: params.commentId } });
  if (!comment) {
    throw new Error("COMMENT_NOT_FOUND");
  }
  if (comment.authorId !== params.actorUserId && params.actorRole !== "admin") {
    throw new Error("FORBIDDEN_NOT_AUTHOR");
  }
  await prisma.comment.delete({ where: { id: params.commentId } });
}

// ─── Comment retention cleanup (long-term by default) ────────────────────────
// Default: 0 = disabled (comments kept forever).
// Set COMMENT_RETAIN_DAYS to a positive number to enable timed cleanup.
// Cleanup is manual-only via POST /api/v1/admin/cleanup — not auto-triggered.

const COMMENT_RETAIN_DAYS = parseInt(process.env.COMMENT_RETAIN_DAYS ?? "0", 10);

/** Returns the cutoff date for comment retention. Returns epoch-0 if disabled. */
export function commentRetentionCutoff(): Date {
  if (!COMMENT_RETAIN_DAYS || COMMENT_RETAIN_DAYS <= 0) {
    // Disabled — return epoch so no comments are deleted
    return new Date(0);
  }
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - COMMENT_RETAIN_DAYS);
  return d;
}

/**
 * Delete comments (and their replies) older than COMMENT_RETAIN_DAYS days.
 * Returns 0 if retention is disabled (default).
 */
export async function pruneOldComments(): Promise<number> {
  const cutoff = commentRetentionCutoff();

  // If retention is disabled (epoch-0), skip deletion entirely
  if (cutoff.getTime() === 0) return 0;

  if (useMockData) {
    const before = mockComments.length;
    // Remove comments older than cutoff, along with any orphaned replies
    const oldIds = new Set(
      mockComments
        .filter((c) => new Date(c.createdAt) < cutoff)
        .map((c) => c.id)
    );
    // Also remove replies whose parents are being deleted
    const toRemove = new Set(
      mockComments
        .filter((c) => oldIds.has(c.id) || (c.parentCommentId && oldIds.has(c.parentCommentId)))
        .map((c) => c.id)
    );
    for (let i = mockComments.length - 1; i >= 0; i--) {
      if (toRemove.has(mockComments[i].id)) mockComments.splice(i, 1);
    }
    return before - mockComments.length;
  }

  const prisma = await getPrisma();
  // Delete root comments older than cutoff; replies cascade via DB FK
  const { count } = await prisma.comment.deleteMany({
    where: { createdAt: { lt: cutoff }, parentCommentId: null },
  });
  return count;
}

export async function createProject(input: {
  title: string;
  oneLiner: string;
  description: string;
  readmeMarkdown?: string;
  techStack: string[];
  tags: string[];
  status: Project["status"];
  demoUrl?: string;
  creatorUserId: string;
}): Promise<Project> {
  return createProjectFromDomain(input);
}

export async function updateProject(params: {
  projectSlug: string;
  actorUserId: string;
  title?: string;
  oneLiner?: string;
  description?: string;
  readmeMarkdown?: string | null;
  techStack?: string[];
  tags?: string[];
  status?: Project["status"];
  demoUrl?: string | null;
}): Promise<Project> {
  return updateProjectFromDomain(params);
}

export async function deleteProject(params: {
  projectSlug: string;
  actorUserId: string;
  actorRole: Role;
}): Promise<void> {
  return deleteProjectFromDomain(params);
}

// ─── P2: 精华机制 ───────────────────────────────────────

export async function featurePost(params: {
  postId: string;
  adminUserId: string;
}): Promise<Post> {
  if (useMockData) {
    const post = mockPosts.find((p) => p.id === params.postId);
    if (!post) throw new Error("POST_NOT_FOUND");
    if (post.reviewStatus !== "approved") throw new Error("POST_NOT_APPROVED");
    post.featuredAt = new Date().toISOString();
    post.featuredBy = params.adminUserId;
    return { ...post };
  }

  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({ where: { id: params.postId } });
  if (!post) throw new Error("POST_NOT_FOUND");
  if (post.reviewStatus !== "approved") throw new Error("POST_NOT_APPROVED");
  const updated = await prisma.post.update({
    where: { id: params.postId },
    data: { featuredAt: new Date(), featuredBy: params.adminUserId },
  });
  return toPostDto(updated);
}

export async function unfeaturePost(params: {
  postId: string;
}): Promise<Post> {
  if (useMockData) {
    const post = mockPosts.find((p) => p.id === params.postId);
    if (!post) throw new Error("POST_NOT_FOUND");
    post.featuredAt = undefined;
    post.featuredBy = undefined;
    return { ...post };
  }

  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({ where: { id: params.postId } });
  if (!post) throw new Error("POST_NOT_FOUND");
  const updated = await prisma.post.update({
    where: { id: params.postId },
    data: { featuredAt: null, featuredBy: null },
  });
  return toPostDto(updated);
}

// ─── P2: 挑战赛活动页 ──────────────────────────────────

function toChallengeDto(c: {
  id: string;
  slug: string;
  title: string;
  description: string;
  rules: string | null;
  tags: string[];
  status: string;
  startDate: Date;
  endDate: Date;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}): Challenge {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    rules: c.rules ?? undefined,
    tags: c.tags,
    status: c.status as ChallengeStatus,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate.toISOString(),
    createdByUserId: c.createdByUserId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function listChallenges(params: {
  status?: ChallengeStatus;
  page: number;
  limit: number;
}): Promise<Paginated<Challenge>> {
  if (useMockData) {
    const filtered = mockChallenges.filter((ch) => {
      return !params.status || ch.status === params.status;
    });
    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where = params.status ? { status: params.status } : {};
  const [items, total] = await Promise.all([
    prisma.challenge.findMany({
      where,
      orderBy: { startDate: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.challenge.count({ where }),
  ]);
  return {
    items: items.map(toChallengeDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function getChallengeBySlug(slug: string): Promise<Challenge | null> {
  if (useMockData) {
    const ch = mockChallenges.find((c) => c.slug === slug);
    return ch ?? null;
  }

  const prisma = await getPrisma();
  const ch = await prisma.challenge.findUnique({ where: { slug } });
  return ch ? toChallengeDto(ch) : null;
}

export async function createChallenge(input: {
  title: string;
  description: string;
  rules?: string;
  tags: string[];
  status?: ChallengeStatus;
  startDate: string;
  endDate: string;
  createdByUserId: string;
}): Promise<Challenge> {
  const slug = input.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  if (useMockData) {
    const ch: Challenge = {
      id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      slug: `${slug}-${Date.now()}`,
      title: input.title,
      description: input.description,
      rules: input.rules,
      tags: input.tags,
      status: input.status ?? "draft",
      startDate: input.startDate,
      endDate: input.endDate,
      createdByUserId: input.createdByUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockChallenges.unshift(ch);
    return ch;
  }

  const prisma = await getPrisma();
  const ch = await prisma.challenge.create({
    data: {
      slug: `${slug}-${Date.now()}`,
      title: input.title,
      description: input.description,
      rules: input.rules ?? null,
      tags: input.tags,
      status: input.status ?? "draft",
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      createdByUserId: input.createdByUserId,
    },
  });
  return toChallengeDto(ch);
}

export async function updateChallenge(params: {
  challengeSlug: string;
  title?: string;
  description?: string;
  rules?: string | null;
  tags?: string[];
  status?: ChallengeStatus;
  startDate?: string;
  endDate?: string;
}): Promise<Challenge> {
  if (useMockData) {
    const ch = mockChallenges.find((c) => c.slug === params.challengeSlug);
    if (!ch) throw new Error("CHALLENGE_NOT_FOUND");
    if (params.title !== undefined) ch.title = params.title;
    if (params.description !== undefined) ch.description = params.description;
    if (params.rules !== undefined) ch.rules = params.rules ?? undefined;
    if (params.tags !== undefined) ch.tags = params.tags;
    if (params.status !== undefined) ch.status = params.status;
    if (params.startDate !== undefined) ch.startDate = params.startDate;
    if (params.endDate !== undefined) ch.endDate = params.endDate;
    ch.updatedAt = new Date().toISOString();
    return { ...ch };
  }

  const prisma = await getPrisma();
  const existing = await prisma.challenge.findUnique({ where: { slug: params.challengeSlug } });
  if (!existing) throw new Error("CHALLENGE_NOT_FOUND");
  const data: Record<string, unknown> = {};
  if (params.title !== undefined) data.title = params.title;
  if (params.description !== undefined) data.description = params.description;
  if (params.rules !== undefined) data.rules = params.rules;
  if (params.tags !== undefined) data.tags = params.tags;
  if (params.status !== undefined) data.status = params.status;
  if (params.startDate !== undefined) data.startDate = new Date(params.startDate);
  if (params.endDate !== undefined) data.endDate = new Date(params.endDate);
  const updated = await prisma.challenge.update({
    where: { slug: params.challengeSlug },
    data,
  });
  return toChallengeDto(updated);
}

export async function deleteChallenge(slug: string): Promise<void> {
  if (useMockData) {
    const idx = mockChallenges.findIndex((c) => c.slug === slug);
    if (idx === -1) throw new Error("CHALLENGE_NOT_FOUND");
    mockChallenges.splice(idx, 1);
    return;
  }

  const prisma = await getPrisma();
  const ch = await prisma.challenge.findUnique({ where: { slug } });
  if (!ch) throw new Error("CHALLENGE_NOT_FOUND");
  await prisma.challenge.delete({ where: { slug } });
}

// ─── P2: 创作者成长面板 ─────────────────────────────────

export async function getCreatorGrowthStats(creatorSlug: string): Promise<CreatorGrowthStats | null> {
  if (useMockData) {
    const creator = mockCreators.find((c) => c.slug === creatorSlug);
    if (!creator) return null;

    const postCount = mockPosts.filter((p) => p.authorId === creator.userId && p.reviewStatus === "approved").length;
    const commentCount = mockComments.filter((c) => c.authorId === creator.userId).length;
    const projectCount = mockProjects.filter((p) => p.creatorId === creator.id).length;
    const featuredPostCount = mockPosts.filter((p) => p.authorId === creator.userId && !!p.featuredAt).length;
    const collaborationIntentCount = mockCollaborationIntents.filter(
      (i) => mockProjects.some((p) => p.id === i.projectId && p.creatorId === creator.id)
    ).length;
    const authorPostIds = new Set(
      mockPosts.filter((p) => p.authorId === creator.userId).map((p) => p.id)
    );
    const receivedCommentCount = mockComments.filter((c) => authorPostIds.has(c.postId)).length;

    return {
      creatorId: creator.id,
      slug: creator.slug,
      headline: creator.headline,
      postCount,
      commentCount,
      projectCount,
      featuredPostCount,
      collaborationIntentCount,
      receivedCommentCount,
    };
  }

  const prisma = await getPrisma();
  const creator = await prisma.creatorProfile.findUnique({
    where: { slug: creatorSlug },
    select: { id: true, slug: true, headline: true, userId: true },
  });
  if (!creator) return null;

  const [postCount, commentCount, projectCount, featuredPostCount, collaborationIntentCount, receivedCommentCount] =
    await Promise.all([
      prisma.post.count({ where: { authorId: creator.userId, reviewStatus: "approved" } }),
      prisma.comment.count({ where: { authorId: creator.userId } }),
      prisma.project.count({ where: { creatorId: creator.id } }),
      prisma.post.count({ where: { authorId: creator.userId, featuredAt: { not: null } } }),
      prisma.collaborationIntent.count({
        where: { project: { creatorId: creator.id } },
      }),
      prisma.comment.count({
        where: { post: { authorId: creator.userId } },
      }),
    ]);

  return {
    creatorId: creator.id,
    slug: creator.slug,
    headline: creator.headline,
    postCount,
    commentCount,
    projectCount,
    featuredPostCount,
    collaborationIntentCount,
    receivedCommentCount,
  };
}

// ─── P3: 协作日志 (Team Activity Log) ──────────────────

export async function listTeamActivityLog(params: {
  teamSlug: string;
  page: number;
  limit: number;
}): Promise<Paginated<TeamActivityLogEntry>> {
  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) return { items: [], pagination: { page: params.page, limit: params.limit, total: 0, totalPages: 1 } };

    const teamEntityTypes = ["team", "team_task", "team_milestone", "team_join_request"];
    const entries = mockAuditLogs
      .filter((log) => {
        if (!teamEntityTypes.includes(log.entityType)) return false;
        const meta = log.metadata as Record<string, unknown> | undefined;
        return meta?.teamId === team.id;
      })
      .map((log) => {
        const user = mockUsers.find((u) => u.id === log.actorId);
        return {
          id: log.id,
          actorId: log.actorId,
          actorName: user?.name,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          metadata: log.metadata,
          createdAt: log.createdAt,
        } as TeamActivityLogEntry;
      });

    return paginateArray(entries, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({ where: { slug: params.teamSlug }, select: { id: true } });
  if (!team) return { items: [], pagination: { page: params.page, limit: params.limit, total: 0, totalPages: 1 } };

  const teamId = team.id;
  const teamEntityTypes = ["team", "team_task", "team_milestone", "team_join_request"];

  const where = {
    entityType: { in: teamEntityTypes },
    metadata: { path: ["teamId"], equals: teamId },
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      include: { actor: { select: { name: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map((log) => ({
      id: log.id,
      actorId: log.actorId,
      actorName: log.actor.name,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata as Record<string, unknown> | undefined,
      createdAt: log.createdAt.toISOString(),
    })),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

// ─── P3: 信誉系统 (Contribution Credits) ────────────────

export async function getContributionCredit(userId: string): Promise<ContributionCreditProfile | null> {
  if (useMockData) {
    return mockContributionCredits.find((c) => c.userId === userId) ?? null;
  }

  const prisma = await getPrisma();
  const credit = await prisma.contributionCredit.findUnique({ where: { userId } });
  if (!credit) return null;
  return {
    userId: credit.userId,
    score: credit.score,
    tasksCompleted: credit.tasksCompleted,
    milestonesHit: credit.milestonesHit,
    joinRequestsMade: credit.joinRequestsMade,
    postsAuthored: credit.postsAuthored,
    commentsAuthored: credit.commentsAuthored,
    projectsCreated: credit.projectsCreated,
    intentsApproved: credit.intentsApproved,
    updatedAt: credit.updatedAt.toISOString(),
  };
}

/** Recompute contribution credit for a user from source data. */
export async function refreshContributionCredit(userId: string): Promise<ContributionCreditProfile> {
  if (useMockData) {
    const tasksCompleted = mockTeamTasks.filter(
      (t) => (t.assigneeUserId === userId || t.createdByUserId === userId) && t.status === "done"
    ).length;
    const milestonesHit = mockTeamMilestones.filter(
      (m) => m.createdByUserId === userId && m.completed
    ).length;
    const joinRequestsMade = mockTeamJoinRequests.filter(
      (r) => r.applicantId === userId
    ).length;
    const postsAuthored = mockPosts.filter(
      (p) => p.authorId === userId && p.reviewStatus === "approved"
    ).length;
    const commentsAuthored = mockComments.filter((c) => c.authorId === userId).length;
    const projectsCreated = mockProjects.filter(
      (p) => mockCreators.some((cr) => cr.id === p.creatorId && cr.userId === userId)
    ).length;
    const intentsApproved = mockCollaborationIntents.filter(
      (i) => i.applicantId === userId && i.status === "approved"
    ).length;

    const score =
      tasksCompleted * 10 +
      milestonesHit * 25 +
      postsAuthored * 15 +
      commentsAuthored * 5 +
      projectsCreated * 20 +
      intentsApproved * 10 +
      joinRequestsMade * 3;

    const profile: ContributionCreditProfile = {
      userId,
      score,
      tasksCompleted,
      milestonesHit,
      joinRequestsMade,
      postsAuthored,
      commentsAuthored,
      projectsCreated,
      intentsApproved,
      updatedAt: new Date().toISOString(),
    };

    const idx = mockContributionCredits.findIndex((c) => c.userId === userId);
    if (idx >= 0) {
      mockContributionCredits[idx] = profile;
    } else {
      mockContributionCredits.push(profile);
    }
    return profile;
  }

  const prisma = await getPrisma();
  const [tasksCompleted, milestonesHit, joinRequestsMade, postsAuthored, commentsAuthored, projectsCreated, intentsApproved] =
    await Promise.all([
      prisma.teamTask.count({ where: { OR: [{ assigneeUserId: userId }, { createdByUserId: userId }], status: "done" } }),
      prisma.teamMilestone.count({ where: { createdByUserId: userId, completed: true } }),
      prisma.teamJoinRequest.count({ where: { applicantId: userId } }),
      prisma.post.count({ where: { authorId: userId, reviewStatus: "approved" } }),
      prisma.comment.count({ where: { authorId: userId } }),
      prisma.project.count({ where: { creator: { userId } } }),
      prisma.collaborationIntent.count({ where: { applicantId: userId, status: "approved" } }),
    ]);

  const score =
    tasksCompleted * 10 +
    milestonesHit * 25 +
    postsAuthored * 15 +
    commentsAuthored * 5 +
    projectsCreated * 20 +
    intentsApproved * 10 +
    joinRequestsMade * 3;

  const credit = await prisma.contributionCredit.upsert({
    where: { userId },
    update: { score, tasksCompleted, milestonesHit, joinRequestsMade, postsAuthored, commentsAuthored, projectsCreated, intentsApproved },
    create: { userId, score, tasksCompleted, milestonesHit, joinRequestsMade, postsAuthored, commentsAuthored, projectsCreated, intentsApproved },
  });

  return {
    userId: credit.userId,
    score: credit.score,
    tasksCompleted: credit.tasksCompleted,
    milestonesHit: credit.milestonesHit,
    joinRequestsMade: credit.joinRequestsMade,
    postsAuthored: credit.postsAuthored,
    commentsAuthored: credit.commentsAuthored,
    projectsCreated: credit.projectsCreated,
    intentsApproved: credit.intentsApproved,
    updatedAt: credit.updatedAt.toISOString(),
  };
}

export async function listContributionLeaderboard(limit: number): Promise<ContributionCreditProfile[]> {
  if (useMockData) {
    return [...mockContributionCredits]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  const prisma = await getPrisma();
  const items = await prisma.contributionCredit.findMany({
    orderBy: { score: "desc" },
    take: limit,
  });
  return items.map((c) => ({
    userId: c.userId,
    score: c.score,
    tasksCompleted: c.tasksCompleted,
    milestonesHit: c.milestonesHit,
    joinRequestsMade: c.joinRequestsMade,
    postsAuthored: c.postsAuthored,
    commentsAuthored: c.commentsAuthored,
    projectsCreated: c.projectsCreated,
    intentsApproved: c.intentsApproved,
    updatedAt: c.updatedAt.toISOString(),
  }));
}

// ─── P3: 商业化首发 (Subscription) ──────────────────────

export function listSubscriptionPlans(): SubscriptionPlanInfo[] {
  if (useMockData) {
    return [...mockSubscriptionPlans];
  }
  // DB path would query SubscriptionPlan table; for now return mock
  return [...mockSubscriptionPlans];
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlanInfo[]> {
  if (useMockData) {
    return [...mockSubscriptionPlans];
  }

  // In integrated schema, SubscriptionPlan is not in DB — use static list
  return [...mockSubscriptionPlans];
}

/** P3 legacy: get user subscription in plan-based format. Use getUserSubscription() for Stripe-based M-1 format. */
export async function getUserSubscriptionLegacy(userId: string): Promise<UserSubscriptionInfo | null> {
  if (useMockData) {
    const sub = mockUserSubscriptions.find((s) => s.userId === userId && s.status === "active");
    return sub ?? null;
  }

  // In the integrated schema, map UserSubscription (Stripe) to UserSubscriptionInfo format
  const sub = await getUserSubscription(userId);
  const plan = mockSubscriptionPlans.find((p) => p.tier === sub.tier) ?? mockSubscriptionPlans[0];
  return {
    id: sub.id,
    userId: sub.userId,
    plan: plan as SubscriptionPlanInfo,
    status: (sub.status === "active" || sub.status === "trialing") ? "active" : sub.status === "past_due" ? "past_due" : "canceled",
    currentPeriodStart: sub.createdAt,
    currentPeriodEnd: sub.currentPeriodEnd ?? new Date(Date.now() + 30 * 86400000).toISOString(),
    canceledAt: sub.cancelAtPeriodEnd ? sub.currentPeriodEnd : undefined,
  };
}

export async function createUserSubscription(params: {
  userId: string;
  planTier: SubscriptionTier;
}): Promise<UserSubscriptionInfo> {
  const plan = mockSubscriptionPlans.find((p) => p.tier === params.planTier);
  if (!plan) throw new Error("PLAN_NOT_FOUND");

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  if (useMockData) {
    const existing = mockUserSubscriptions.findIndex(
      (s) => s.userId === params.userId && s.status === "active"
    );
    if (existing >= 0) {
      mockUserSubscriptions[existing].status = "canceled";
      mockUserSubscriptions[existing].canceledAt = now.toISOString();
    }

    const sub = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      plan,
      status: "active" as const,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    };
    mockUserSubscriptions.push(sub);
    return sub;
  }

  // In integrated schema use upsertUserSubscription
  const sub = await upsertUserSubscription({ userId: params.userId, tier: params.planTier, status: "active", currentPeriodEnd: periodEnd });
  const planInfo = mockSubscriptionPlans.find((p) => p.tier === params.planTier) ?? mockSubscriptionPlans[0];
  return {
    id: sub.id,
    userId: sub.userId,
    plan: planInfo,
    status: "active",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd ?? periodEnd.toISOString(),
  };
}

export async function cancelUserSubscription(userId: string): Promise<void> {
  if (useMockData) {
    const sub = mockUserSubscriptions.find((s) => s.userId === userId && s.status === "active");
    if (!sub) throw new Error("NO_ACTIVE_SUBSCRIPTION");
    sub.status = "canceled";
    sub.canceledAt = new Date().toISOString();
    return;
  }

  // In the integrated schema, set cancelAtPeriodEnd = true
  const result = await upsertUserSubscription({ userId, tier: "free", status: "canceled", cancelAtPeriodEnd: true });
  if (!result.id) throw new Error("NO_ACTIVE_SUBSCRIPTION");
}

export async function getEmbedProjectCard(slug: string): Promise<EmbedProjectCard | null> {
  const project = await getProjectBySlug(slug);
  if (!project) return null;
  return {
    slug: project.slug,
    title: project.title,
    oneLiner: project.oneLiner,
    status: project.status,
    techStack: project.techStack,
    tags: project.tags,
    team: project.team,
    updatedAt: project.updatedAt,
    vibehubUrl: `/projects/${project.slug}`,
  };
}

export async function getEmbedTeamCard(slug: string): Promise<EmbedTeamCard | null> {
  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === slug);
    if (!team) return null;
    const memberCount = mockTeamMemberships.filter((m) => m.teamId === team.id).length;
    const projectCount = mockProjects.filter((p) => p.teamId === team.id).length;
    return {
      slug: team.slug,
      name: team.name,
      mission: team.mission,
      memberCount,
      projectCount,
      vibehubUrl: `/teams/${team.slug}`,
    };
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      _count: { select: { memberships: true, projects: true } },
    },
  });
  if (!team) return null;
  return {
    slug: team.slug,
    name: team.name,
    mission: team.mission ?? undefined,
    memberCount: team._count.memberships,
    projectCount: team._count.projects,
    vibehubUrl: `/teams/${team.slug}`,
  };
}

// ─── P4: Enterprise Radar + Due Diligence ───────────────

export async function getProjectRadar(limit: number): Promise<ProjectRadarEntry[]> {
  if (useMockData) {
    return mockProjects.map((p) => {
      const commentCount = mockComments.filter(() =>
        mockPosts.some((post) =>
          post.authorId === mockCreators.find((cr) => cr.id === p.creatorId)?.userId
        )
      ).length;
      const intentCount = mockCollaborationIntents.filter((i) => i.projectId === p.id).length;
      const recencyBonus = Math.max(0, 30 - Math.floor((Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24)));
      return {
        slug: p.slug,
        title: p.title,
        oneLiner: p.oneLiner,
        status: p.status,
        techStack: p.techStack,
        score: intentCount * 15 + commentCount * 5 + recencyBonus,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  }

  const prisma = await getPrisma();
  const projects = await prisma.project.findMany({
    include: {
      _count: { select: { collaborationIntents: true } },
      team: { select: { slug: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit * 3,
  });

  return projects
    .map((p) => {
      const recencyBonus = Math.max(0, 30 - Math.floor((Date.now() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        slug: p.slug,
        title: p.title,
        oneLiner: p.oneLiner,
        status: p.status as ProjectRadarEntry["status"],
        techStack: p.techStack,
        score: p._count.collaborationIntents * 15 + recencyBonus,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** P4 alias: enterprise talent radar (by contribution score, no filter). Use getTalentRadar() for filter-based radar. */
export async function getTalentRadarLegacy(limit: number): Promise<TalentRadarEntry[]> {
  if (useMockData) {
    return mockCreators.map((cr) => {
      const credit = mockContributionCredits.find((c) => c.userId === cr.userId);
      const projectCount = mockProjects.filter((p) => p.creatorId === cr.id).length;
      return {
        creatorSlug: cr.slug,
        headline: cr.headline,
        skills: cr.skills,
        collaborationPreference: cr.collaborationPreference,
        contributionScore: credit?.score ?? 0,
        projectCount,
      };
    })
    .sort((a, b) => b.contributionScore - a.contributionScore)
    .slice(0, limit);
  }

  const prisma = await getPrisma();
  const creators = await prisma.creatorProfile.findMany({
    include: { _count: { select: { projects: true } } },
  });

  const credits = await prisma.contributionCredit.findMany();
  const creditMap = new Map(credits.map((c) => [c.userId, c.score]));

  return creators
    .map((cr) => ({
      creatorSlug: cr.slug,
      headline: cr.headline,
      skills: cr.skills,
      collaborationPreference: cr.collaborationPreference,
      contributionScore: creditMap.get(cr.userId) ?? 0,
      projectCount: cr._count.projects,
    }))
    .sort((a, b) => b.contributionScore - a.contributionScore)
    .slice(0, limit);
}

export async function getProjectDueDiligence(slug: string): Promise<ProjectDueDiligence | null> {
  if (useMockData) {
    const project = mockProjects.find((p) => p.slug === slug);
    if (!project) return null;
    const creator = mockCreators.find((c) => c.id === project.creatorId);
    const team = project.teamId ? mockTeams.find((t) => t.id === project.teamId) : undefined;
    const commentCount = mockComments.filter((c) =>
      mockPosts.some((p) => p.authorId === creator?.userId && p.id === c.postId)
    ).length;
    const collaborationIntentCount = mockCollaborationIntents.filter((i) => i.projectId === project.id).length;

    return {
      slug: project.slug,
      title: project.title,
      oneLiner: project.oneLiner,
      description: project.description,
      status: project.status,
      techStack: project.techStack,
      tags: project.tags,
      team: team ? { slug: team.slug, name: team.name, memberCount: mockTeamMemberships.filter((m) => m.teamId === team.id).length } : undefined,
      commentCount,
      collaborationIntentCount,
      creatorSlug: creator?.slug,
      creatorHeadline: creator?.headline,
      updatedAt: project.updatedAt,
    };
  }

  const prisma = await getPrisma();
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      creator: { select: { userId: true, slug: true, headline: true } },
      team: {
        select: {
          slug: true,
          name: true,
          _count: { select: { memberships: true } },
        },
      },
      _count: { select: { collaborationIntents: true } },
    },
  });
  if (!project) return null;

  const commentCount = await prisma.comment.count({
    where: { post: { authorId: project.creator.userId } },
  });

  return {
    slug: project.slug,
    title: project.title,
    oneLiner: project.oneLiner,
    description: project.description,
    status: project.status as ProjectDueDiligence["status"],
    techStack: project.techStack,
    tags: project.tags,
    team: project.team ? { slug: project.team.slug, name: project.team.name, memberCount: project.team._count.memberships } : undefined,
    commentCount,
    collaborationIntentCount: project._count.collaborationIntents,
    creatorSlug: project.creator.slug,
    creatorHeadline: project.creator.headline,
    updatedAt: project.updatedAt.toISOString(),
  };
}

// ─── P4: Ecosystem Reports ──────────────────────────────

export async function generateEcosystemReport(period: string): Promise<EcosystemReport> {
  if (useMockData) {
    const topProjects = mockProjects
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        count: mockCollaborationIntents.filter((i) => i.projectId === p.id).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topDiscussions = mockPosts
      .filter((p) => p.reviewStatus === "approved")
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        count: mockComments.filter((c) => c.postId === p.id).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topCreators = [...mockContributionCredits]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((c) => ({ userId: c.userId, score: c.score }));

    return {
      period,
      generatedAt: new Date().toISOString(),
      metrics: {
        totalUsers: mockUsers.length,
        totalProjects: mockProjects.length,
        totalPosts: mockPosts.length,
        totalComments: mockComments.length,
        totalTeams: mockTeams.length,
        totalCollaborationIntents: mockCollaborationIntents.length,
        approvedIntents: mockCollaborationIntents.filter((i) => i.status === "approved").length,
        activeChallenge: mockChallenges.filter((c) => c.status === "active").length,
        topProjectsByIntents: topProjects,
        topDiscussionsByComments: topDiscussions,
        topCreatorsByScore: topCreators,
      },
    };
  }

  const prisma = await getPrisma();
  const [totalUsers, totalProjects, totalPosts, totalComments, totalTeams, totalCollaborationIntents, approvedIntents, activeChallenge] =
    await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.post.count({ where: { reviewStatus: "approved" } }),
      prisma.comment.count(),
      prisma.team.count(),
      prisma.collaborationIntent.count(),
      prisma.collaborationIntent.count({ where: { status: "approved" } }),
      prisma.challenge.count({ where: { status: "active" } }),
    ]);

  const topProjectsRaw = await prisma.collaborationIntent.groupBy({
    by: ["projectId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });
  const topProjectIds = topProjectsRaw.map((r) => r.projectId);
  const topProjectDetails = topProjectIds.length > 0
    ? await prisma.project.findMany({ where: { id: { in: topProjectIds } }, select: { id: true, slug: true, title: true } })
    : [];
  const projectMap = new Map(topProjectDetails.map((p) => [p.id, p]));
  const topProjectsByIntents = topProjectsRaw.map((r) => {
    const p = projectMap.get(r.projectId);
    return { slug: p?.slug ?? "", title: p?.title ?? "", count: r._count.id };
  });

  const topDiscussionsRaw = await prisma.comment.groupBy({
    by: ["postId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });
  const topPostIds = topDiscussionsRaw.map((r) => r.postId);
  const topPostDetails = topPostIds.length > 0
    ? await prisma.post.findMany({ where: { id: { in: topPostIds } }, select: { id: true, slug: true, title: true } })
    : [];
  const postMap = new Map(topPostDetails.map((p) => [p.id, p]));
  const topDiscussionsByComments = topDiscussionsRaw.map((r) => {
    const p = postMap.get(r.postId);
    return { slug: p?.slug ?? "", title: p?.title ?? "", count: r._count.id };
  });

  const topCredits = await prisma.contributionCredit.findMany({
    orderBy: { score: "desc" },
    take: 5,
    select: { userId: true, score: true },
  });

  return {
    period,
    generatedAt: new Date().toISOString(),
    metrics: {
      totalUsers,
      totalProjects,
      totalPosts,
      totalComments,
      totalTeams,
      totalCollaborationIntents,
      approvedIntents,
      activeChallenge,
      topProjectsByIntents,
      topDiscussionsByComments,
      topCreatorsByScore: topCredits,
    },
  };
}

