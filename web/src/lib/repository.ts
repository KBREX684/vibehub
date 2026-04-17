import { assertContentSafeText, assertUrlCountAtMost, escapeHtmlAngleBrackets } from "@/lib/content-safety";
import { assertPublicHttpsUrl } from "@/lib/private-network-url";
import { incrementContributionCreditField, contributionWeights } from "@/lib/contribution-credit-increment";
import { dispatchNotificationPush } from "@/lib/push-dispatcher";
import { decryptStoredSecret, encryptStoredSecret } from "@/lib/secret-crypto";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher";
import { WEBHOOK_EVENT_NAMES, isWebhookEventName } from "@/lib/webhook-events";
import { paginateArray } from "@/lib/pagination";
import { COLLECTION_TOPICS } from "@/lib/topics-config";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { mapPrismaToRepositoryError, RepositoryError } from "@/lib/repository-errors";
import { hashApiKeyToken, generateApiKeyPlaintext, isApiKeyTokenFormat } from "@/lib/api-key-crypto";
import { generateSecureToken, hashPassword, verifyPassword } from "@/lib/auth-password";
import { DEFAULT_API_KEY_SCOPES, normalizeApiKeyScopes } from "@/lib/api-key-scopes";
import { createApiKeyUsageSnapshot } from "@/lib/api-key-usage";
import {
  enterpriseProfileSelect,
  sessionEnterpriseFromProfile,
} from "@/lib/enterprise-profile-db";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { creatorFtsWhereClause, postFtsWhereClause, projectFtsWhereClause } from "@/lib/fts-sql";
import {
  mockApiKeys,
} from "@/lib/data/mock-api-keys";
import { mockAgentBindings } from "@/lib/data/mock-agent-bindings";
import { mockTeamAgentMemberships } from "@/lib/data/mock-team-agent-memberships";
import {
  mockAuditLogs,
  mockAgentActionAudits,
  mockAgentConfirmationRequests,
  mockComments,
  mockCollaborationIntents,
  mockCreators,
  mockModerationCases,
  mockMcpInvokeAudits,
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
  mockTeamDiscussions,
  mockTeamTaskComments,
  mockTeamChatMessages,
  mockWebhookEndpoints,
} from "@/lib/data/mock-data";
import type {
  ApiKeyCreated,
  ApiKeySummary,
  ApiKeyUsageSnapshot,
  AgentBindingSummary,
  AgentActionAuditRow,
  AgentActionStatus,
  AgentConfirmationRequest,
  AgentConfirmationStatus,
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
  TeamAgentRole,
  TeamAgentMembershipSummary,
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
  TeamDiscussion,
  WeeklyLeaderboardKind,
  WeeklyLeaderboardMaterializedRow,
  WeeklyLeaderboardMaterializedSnapshot,
  WeeklyLeaderboardPublicPayload,
  TeamChatMessage,
  TeamTaskComment,
  EnterpriseProfile,
  EnterpriseVerificationApplication,
  EnterpriseVerificationStatus,
  ProjectSortOrder,
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
  updateTeamProfile as updateTeamProfileFromDomain,
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
  agentBindingId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
}): AuditLog {
  return {
    id: item.id,
    actorId: item.actorId,
    agentBindingId: item.agentBindingId ?? undefined,
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

function normalizeProjectFeed(project: Project): Project {
  const bookmarkCount = project.bookmarkCount ?? 0;
  const recentBookmarkDelta = project.recentBookmarkDelta ?? 0;
  const collaborationIntentCount = project.collaborationIntentCount ?? 0;
  const activityScore = project.activityScore ?? bookmarkCount * 3 + collaborationIntentCount * 5;
  return {
    ...project,
    bookmarkCount,
    recentBookmarkDelta,
    collaborationIntentCount,
    activityScore,
  };
}

function projectUpdatedWithin30DaysBoost(updatedAtIso: string): number {
  const ageMs = Date.now() - new Date(updatedAtIso).getTime();
  return ageMs <= 30 * 24 * 60 * 60 * 1000 ? 2 : 0;
}

function projectFeaturedWeight(featuredRank?: number | null): number {
  if (featuredRank == null) return 0;
  // Lower rank means a stronger editorial pick; convert it into a positive boost.
  return Math.max(1, 11 - Math.min(featuredRank, 10)) * 100;
}

function computeProjectDiscoveryScore(input: {
  bookmarkCount: number;
  recentBookmarkDelta?: number;
  collaborationIntentCount: number;
  updatedAt: string;
  creatorContributionScore?: number;
  featuredRank?: number | null;
}) {
  return (
    input.bookmarkCount * 3 +
    (input.recentBookmarkDelta ?? 0) +
    input.collaborationIntentCount * 5 +
    projectUpdatedWithin30DaysBoost(input.updatedAt) +
    (input.creatorContributionScore ?? 0) * 0.1 +
    projectFeaturedWeight(input.featuredRank)
  );
}

export async function listProjectFeed(params: {
  query?: string;
  tag?: string;
  tech?: string;
  status?: Project["status"];
  team?: string;
  creatorId?: string;
  viewerUserId?: string | null;
  sort?: ProjectSortOrder;
  page: number;
  limit: number;
}): Promise<Paginated<Project>> {
  const sort = params.sort ?? "latest";

  if (useMockData) {
    const teamIdFilter = params.team ? mockTeams.find((item) => item.slug === params.team)?.id : undefined;
    if (params.team && !teamIdFilter) {
      return { items: [], pagination: { page: params.page, limit: params.limit, total: 0, totalPages: 1 } };
    }
    const filtered = mockProjects.filter((project) => {
      const q = params.query?.toLowerCase().trim();
      const tag = params.tag?.toLowerCase().trim();
      const tech = params.tech?.toLowerCase().trim();
      const queryMatch =
        !q ||
        project.title.toLowerCase().includes(q) ||
        project.description.toLowerCase().includes(q) ||
        project.tags.some((item) => item.toLowerCase().includes(q));
      const tagMatch = !tag || project.tags.some((item) => item.toLowerCase() === tag);
      const techMatch = !tech || project.techStack.some((item) => item.toLowerCase() === tech);
      const statusMatch = !params.status || project.status === params.status;
      const teamMatch = !teamIdFilter || project.teamId === teamIdFilter;
      const creatorMatch = !params.creatorId || project.creatorId === params.creatorId;
      return queryMatch && tagMatch && techMatch && statusMatch && teamMatch && creatorMatch;
    });

    const interestTags = new Map<string, number>();
    const interestTech = new Map<string, number>();
    const followedCreatorUserIds = new Set(
      params.viewerUserId
        ? mockUserFollows.filter((item) => item.followerId === params.viewerUserId).map((item) => item.followingId)
        : []
    );
    if (params.viewerUserId) {
      for (const bookmark of mockProjectBookmarks.filter((item) => item.userId === params.viewerUserId)) {
        const project = mockProjects.find((item) => item.id === bookmark.projectId);
        if (!project) continue;
        for (const tag of project.tags) interestTags.set(tag, (interestTags.get(tag) ?? 0) + 4);
        for (const tech of project.techStack) interestTech.set(tech, (interestTech.get(tech) ?? 0) + 3);
      }
      for (const project of mockProjects.filter((item) => {
        const creator = mockCreators.find((creatorRow) => creatorRow.id === item.creatorId);
        return creator?.userId === params.viewerUserId;
      })) {
        for (const tag of project.tags) interestTags.set(tag, (interestTags.get(tag) ?? 0) + 2);
        for (const tech of project.techStack) interestTech.set(tech, (interestTech.get(tech) ?? 0) + 2);
      }
      for (const intent of mockCollaborationIntents.filter((item) => item.applicantId === params.viewerUserId)) {
        const project = mockProjects.find((item) => item.id === intent.projectId);
        if (!project) continue;
        for (const tag of project.tags) interestTags.set(tag, (interestTags.get(tag) ?? 0) + 3);
        for (const tech of project.techStack) interestTech.set(tech, (interestTech.get(tech) ?? 0) + 2);
      }
    }

    const items = filtered.map((project) => {
      const bookmarkCount = mockProjectBookmarks.filter((item) => item.projectId === project.id).length;
      const recentBookmarkDelta = mockProjectBookmarks.filter((item) => {
        if (item.projectId !== project.id) return false;
        return Date.now() - new Date(item.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
      }).length;
      const collaborationIntentCount = mockCollaborationIntents.filter((item) => item.projectId === project.id).length;
      const creator = mockCreators.find((item) => item.id === project.creatorId);
      const credit = creator ? mockContributionCredits.find((item) => item.userId === creator.userId) : undefined;
      const recommendationScore =
        project.tags.reduce((sum, tag) => sum + (interestTags.get(tag) ?? 0), 0) +
        project.techStack.reduce((sum, tech) => sum + (interestTech.get(tech) ?? 0), 0) +
        (creator && followedCreatorUserIds.has(creator.userId) ? 8 : 0) +
        computeProjectDiscoveryScore({
          bookmarkCount,
          recentBookmarkDelta,
          collaborationIntentCount,
          updatedAt: project.updatedAt,
          creatorContributionScore: credit?.score,
          featuredRank: project.featuredRank,
        });
      return normalizeProjectFeed({
        ...project,
        bookmarkCount,
        recentBookmarkDelta,
        collaborationIntentCount,
        activityScore: computeProjectDiscoveryScore({
          bookmarkCount,
          recentBookmarkDelta,
          collaborationIntentCount,
          updatedAt: project.updatedAt,
          creatorContributionScore: credit?.score,
          featuredRank: project.featuredRank,
        }),
        featuredRank: sort === "recommended" ? Math.round(recommendationScore) : project.featuredRank,
      });
    });

    const sorted = [...items].sort((a, b) => {
      if (sort === "featured") {
        const rankA = a.featuredRank ?? Number.MAX_SAFE_INTEGER;
        const rankB = b.featuredRank ?? Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
      } else if (sort === "recommended") {
        const scoreDiff = (b.featuredRank ?? 0) - (a.featuredRank ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
      } else if (sort === "hot") {
        const scoreDiff = (b.activityScore ?? 0) - (a.activityScore ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
      }
      const updatedDiff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (updatedDiff !== 0) return updatedDiff;
      return b.id.localeCompare(a.id);
    }).filter((project) => (sort === "featured" ? project.featuredRank != null : true));

    return paginateArray(sorted, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const baseWhere: Prisma.ProjectWhereInput = {
    AND: [
      params.tag ? { tags: { has: params.tag } } : {},
      params.tech ? { techStack: { has: params.tech } } : {},
      params.status ? { status: params.status } : {},
      params.team ? { team: { slug: params.team } } : {},
      params.creatorId ? { creatorId: params.creatorId } : {},
      params.query?.trim()
        ? {
            OR: [
              { title: { contains: params.query.trim(), mode: "insensitive" } },
              { oneLiner: { contains: params.query.trim(), mode: "insensitive" } },
              { description: { contains: params.query.trim(), mode: "insensitive" } },
              { tags: { has: params.query.trim() } },
            ],
          }
        : {},
      sort === "featured" ? { featuredRank: { not: null } } : {},
    ],
  };

  const rows = await prisma.project.findMany({
    where: baseWhere,
    include: {
      team: { select: { slug: true, name: true } },
      creator: { select: { userId: true } },
      _count: { select: { bookmarks: true, collaborationIntents: true } },
    },
  });
  const creditRows = await prisma.contributionCredit.findMany({
    where: { userId: { in: rows.map((row) => row.creator.userId) } },
    select: { userId: true, score: true },
  });
  const creditMap = new Map(creditRows.map((row) => [row.userId, row.score]));
  const recentBookmarkRows = rows.length
    ? await prisma.projectBookmark.groupBy({
        by: ["projectId"],
        where: {
          projectId: { in: rows.map((row) => row.id) },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        _count: { _all: true },
      })
    : [];
  const recentBookmarkMap = new Map(recentBookmarkRows.map((row) => [row.projectId, row._count._all]));
  const bookmarkedRows = params.viewerUserId
    ? await prisma.projectBookmark.findMany({
        where: { userId: params.viewerUserId },
        include: { project: { select: { tags: true, techStack: true } } },
        take: 100,
        orderBy: { createdAt: "desc" },
      })
    : [];
  const ownProjects = params.viewerUserId
    ? await prisma.project.findMany({
        where: { creator: { userId: params.viewerUserId } },
        select: { tags: true, techStack: true },
        take: 50,
        orderBy: { updatedAt: "desc" },
      })
    : [];
  const intents = params.viewerUserId
    ? await prisma.collaborationIntent.findMany({
        where: { applicantId: params.viewerUserId },
        include: { project: { select: { tags: true, techStack: true } } },
        take: 100,
        orderBy: { createdAt: "desc" },
      })
    : [];
  const follows = params.viewerUserId
    ? await prisma.userFollow.findMany({ where: { followerId: params.viewerUserId }, select: { followingId: true } })
    : [];
  const interestTags = new Map<string, number>();
  const interestTech = new Map<string, number>();
  for (const bookmark of bookmarkedRows) {
    for (const tag of bookmark.project.tags) interestTags.set(tag, (interestTags.get(tag) ?? 0) + 4);
    for (const tech of bookmark.project.techStack) interestTech.set(tech, (interestTech.get(tech) ?? 0) + 3);
  }
  for (const project of ownProjects) {
    for (const tag of project.tags) interestTags.set(tag, (interestTags.get(tag) ?? 0) + 2);
    for (const tech of project.techStack) interestTech.set(tech, (interestTech.get(tech) ?? 0) + 2);
  }
  for (const intent of intents) {
    for (const tag of intent.project.tags) interestTags.set(tag, (interestTags.get(tag) ?? 0) + 3);
    for (const tech of intent.project.techStack) interestTech.set(tech, (interestTech.get(tech) ?? 0) + 2);
  }
  const followedCreatorIds = new Set(follows.map((item) => item.followingId));
  const items = rows.map((row) =>
    normalizeProjectFeed({
      ...toProjectDto({ ...row, team: row.team }),
      bookmarkCount: row._count.bookmarks,
      recentBookmarkDelta: recentBookmarkMap.get(row.id) ?? 0,
      collaborationIntentCount: row._count.collaborationIntents,
      activityScore: computeProjectDiscoveryScore({
        bookmarkCount: row._count.bookmarks,
        recentBookmarkDelta: recentBookmarkMap.get(row.id) ?? 0,
        collaborationIntentCount: row._count.collaborationIntents,
        updatedAt: row.updatedAt.toISOString(),
        creatorContributionScore: creditMap.get(row.creator.userId),
        featuredRank: row.featuredRank,
      }),
      featuredRank:
        sort === "recommended"
          ? row.tags.reduce((sum, tag) => sum + (interestTags.get(tag) ?? 0), 0) +
            row.techStack.reduce((sum, tech) => sum + (interestTech.get(tech) ?? 0), 0) +
            (followedCreatorIds.has(row.creator.userId) ? 8 : 0) +
            computeProjectDiscoveryScore({
              bookmarkCount: row._count.bookmarks,
              recentBookmarkDelta: recentBookmarkMap.get(row.id) ?? 0,
              collaborationIntentCount: row._count.collaborationIntents,
              updatedAt: row.updatedAt.toISOString(),
              creatorContributionScore: creditMap.get(row.creator.userId),
              featuredRank: row.featuredRank,
            })
          : row.featuredRank ?? undefined,
    })
  );

  const sorted = [...items].sort((a, b) => {
    if (sort === "featured") {
      const rankA = a.featuredRank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.featuredRank ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
    } else if (sort === "recommended") {
      const scoreDiff = (b.featuredRank ?? 0) - (a.featuredRank ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
    } else if (sort === "hot") {
      const scoreDiff = (b.activityScore ?? 0) - (a.activityScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return paginateArray(sorted, params.page, params.limit);
}

export async function getProjectFilterFacets(): Promise<{ tags: string[]; techStack: string[] }> {
  return getProjectFilterFacetsFromDomain();
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  return getProjectBySlugFromDomain(slug);
}

export async function getProjectEngagementSnapshot(params: {
  projectId: string;
  viewerUserId?: string | null;
  limit?: number;
}): Promise<{
  bookmarkCount: number;
  recentBookmarkDelta: number;
  viewerHasBookmarked: boolean;
  recentBookmarkers: Array<{ userId: string; name: string }>;
  recentCollaborationIntents: Array<{
    id: string;
    applicantId: string;
    applicantName: string;
    intentType: CollaborationIntent["intentType"];
    message: string;
    status: CollaborationIntent["status"];
    createdAt: string;
  }>;
}> {
  const limit = Math.max(1, Math.min(params.limit ?? 3, 6));
  if (useMockData) {
    const projectBookmarks = mockProjectBookmarks.filter((item) => item.projectId === params.projectId);
    const recentBookmarkers = projectBookmarks
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((item) => ({
        userId: item.userId,
        name: mockUsers.find((user) => user.id === item.userId)?.name ?? item.userId,
      }));
    const recentCollaborationIntents = mockCollaborationIntents
      .filter((item) => item.projectId === params.projectId)
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        applicantId: item.applicantId,
        applicantName: mockUsers.find((user) => user.id === item.applicantId)?.name ?? item.applicantId,
        intentType: item.intentType,
        message: item.message,
        status: item.status,
        createdAt: item.createdAt,
      }));
    return {
      bookmarkCount: projectBookmarks.length,
      recentBookmarkDelta: projectBookmarks.filter((item) => Date.now() - new Date(item.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000).length,
      viewerHasBookmarked: Boolean(params.viewerUserId && projectBookmarks.some((item) => item.userId === params.viewerUserId)),
      recentBookmarkers,
      recentCollaborationIntents,
    };
  }

  const prisma = await getPrisma();
  const recentThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [bookmarkCount, recentBookmarkDelta, viewerBookmark, recentBookmarkers, recentCollaborationIntents] = await Promise.all([
    prisma.projectBookmark.count({ where: { projectId: params.projectId } }),
    prisma.projectBookmark.count({ where: { projectId: params.projectId, createdAt: { gte: recentThreshold } } }),
    params.viewerUserId
      ? prisma.projectBookmark.findFirst({
          where: { projectId: params.projectId, userId: params.viewerUserId },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.projectBookmark.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.collaborationIntent.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { applicant: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    bookmarkCount,
    recentBookmarkDelta,
    viewerHasBookmarked: Boolean(viewerBookmark),
    recentBookmarkers: recentBookmarkers.map((item) => ({ userId: item.user.id, name: item.user.name })),
    recentCollaborationIntents: recentCollaborationIntents.map((item) => ({
      id: item.id,
      applicantId: item.applicant.id,
      applicantName: item.applicant.name,
      intentType: item.intentType,
      message: item.message,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    })),
  };
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
  reviewRequestedAt?: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}): TeamTask {
  const assignee = row.assigneeUserId ? mockUsers.find((u) => u.id === row.assigneeUserId) : undefined;
  const reviewer = row.reviewedByUserId ? mockUsers.find((u) => u.id === row.reviewedByUserId) : undefined;
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
    reviewRequestedAt: row.reviewRequestedAt,
    reviewedAt: row.reviewedAt,
    reviewedByUserId: row.reviewedByUserId,
    reviewedByName: reviewer?.name,
    reviewNote: row.reviewNote,
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

function canManageTeamMembership(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

function canReviewJoinRequests(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

function canReviewTasks(role: TeamRole): boolean {
  return role === "owner" || role === "admin" || role === "reviewer";
}

function isTeamTaskStatus(value: string): value is TeamTaskStatus {
  return value === "todo" || value === "doing" || value === "review" || value === "done" || value === "rejected";
}

async function assertActiveAgentBindingForUser(params: {
  userId: string;
  agentBindingId?: string;
}): Promise<AgentBindingSummary | null> {
  if (!params.agentBindingId) return null;
  if (useMockData) {
    const row = mockAgentBindings.find(
      (item) => item.id === params.agentBindingId && item.userId === params.userId && item.active
    );
    if (!row) {
      throw new Error("AGENT_BINDING_INACTIVE");
    }
    return toAgentBindingSummary(row);
  }
  const prisma = await getPrisma();
  const row = await prisma.agentBinding.findFirst({
    where: { id: params.agentBindingId, userId: params.userId, active: true },
  });
  if (!row) {
    throw new Error("AGENT_BINDING_INACTIVE");
  }
  return toAgentBindingSummary(row);
}

function toAgentActionAuditDto(row: {
  id: string;
  actorUserId: string;
  agentBindingId: string;
  apiKeyId?: string | null;
  teamId?: string | null;
  taskId?: string | null;
  action: string;
  outcome: AgentActionStatus;
  metadata?: unknown;
  createdAt: string | Date;
}): AgentActionAuditRow {
  return {
    id: row.id,
    actorUserId: row.actorUserId,
    agentBindingId: row.agentBindingId,
    apiKeyId: row.apiKeyId ?? undefined,
    teamId: row.teamId ?? undefined,
    taskId: row.taskId ?? undefined,
    action: row.action,
    outcome: row.outcome,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : undefined,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
  };
}

function toAgentConfirmationDto(row: {
  id: string;
  requesterUserId: string;
  agentBindingId: string;
  apiKeyId?: string | null;
  teamId?: string | null;
  taskId?: string | null;
  targetType: string;
  targetId: string;
  action: string;
  reason?: string | null;
  payload: unknown;
  status: AgentConfirmationStatus;
  decidedByUserId?: string | null;
  decidedByName?: string | null;
  decidedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  createdAt: string | Date;
  teamSlug?: string | null;
  taskTitle?: string | null;
}): AgentConfirmationRequest {
  return {
    id: row.id,
    requesterUserId: row.requesterUserId,
    agentBindingId: row.agentBindingId,
    apiKeyId: row.apiKeyId ?? undefined,
    teamId: row.teamId ?? undefined,
    teamSlug: row.teamSlug ?? undefined,
    taskId: row.taskId ?? undefined,
    taskTitle: row.taskTitle ?? undefined,
    targetType: row.targetType,
    targetId: row.targetId,
    action: row.action,
    reason: row.reason ?? undefined,
    payload:
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
    status: row.status,
    decidedByUserId: row.decidedByUserId ?? undefined,
    decidedByName: row.decidedByName ?? undefined,
    decidedAt: row.decidedAt
      ? typeof row.decidedAt === "string"
        ? row.decidedAt
        : row.decidedAt.toISOString()
      : undefined,
    expiresAt: row.expiresAt
      ? typeof row.expiresAt === "string"
        ? row.expiresAt
        : row.expiresAt.toISOString()
      : undefined,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
  };
}

async function recordAgentActionAudit(params: {
  actorUserId: string;
  agentBindingId: string;
  apiKeyId?: string;
  teamId?: string | null;
  taskId?: string | null;
  action: string;
  outcome: AgentActionStatus;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const now = new Date().toISOString();
  if (useMockData) {
    mockAgentActionAudits.unshift({
      id: `agent_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      actorUserId: params.actorUserId,
      agentBindingId: params.agentBindingId,
      apiKeyId: params.apiKeyId,
      teamId: params.teamId ?? undefined,
      taskId: params.taskId ?? undefined,
      action: params.action,
      outcome: params.outcome,
      metadata: params.metadata,
      createdAt: now,
    });
    return;
  }
  const prisma = await getPrisma();
  await prisma.agentActionAudit.create({
    data: {
      actorUserId: params.actorUserId,
      agentBindingId: params.agentBindingId,
      apiKeyId: params.apiKeyId ?? null,
      teamId: params.teamId ?? null,
      taskId: params.taskId ?? null,
      action: params.action,
      outcome: params.outcome,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

async function createAgentConfirmationRequest(params: {
  requesterUserId: string;
  agentBindingId: string;
  apiKeyId?: string;
  teamId?: string | null;
  taskId?: string | null;
  teamSlug?: string;
  taskTitle?: string;
  targetType: string;
  targetId: string;
  action: string;
  reason?: string;
  payload: Record<string, unknown>;
  notifyUserIds?: string[];
}): Promise<AgentConfirmationRequest> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3);
  if (useMockData) {
    const row = toAgentConfirmationDto({
      id: `agent_confirm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      requesterUserId: params.requesterUserId,
      agentBindingId: params.agentBindingId,
      apiKeyId: params.apiKeyId,
      teamId: params.teamId ?? undefined,
      taskId: params.taskId ?? undefined,
      targetType: params.targetType,
      targetId: params.targetId,
      action: params.action,
      reason: params.reason,
      payload: params.payload,
      status: "pending",
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      teamSlug: params.teamSlug,
      taskTitle: params.taskTitle,
    });
    mockAgentConfirmationRequests.unshift(row);
    for (const userId of [...new Set(params.notifyUserIds ?? [])]) {
      if (!userId) continue;
      void notifyUser({
        userId,
        kind: "agent_confirmation_required",
        title: "Agent action requires confirmation",
        body: `Agent request pending: ${params.action}${params.taskTitle ? ` on “${params.taskTitle}”` : ""}.`,
        metadata: { confirmationRequestId: row.id, teamSlug: params.teamSlug, taskId: params.taskId, action: params.action },
      });
      void dispatchWebhookEvent(userId, "agent.confirmation_required", {
        confirmationRequestId: row.id,
        action: params.action,
        teamSlug: params.teamSlug,
        taskId: params.taskId,
      });
    }
    return row;
  }
  const prisma = await getPrisma();
  const created = await prisma.agentConfirmationRequest.create({
    data: {
      requesterUserId: params.requesterUserId,
      agentBindingId: params.agentBindingId,
      apiKeyId: params.apiKeyId ?? null,
      teamId: params.teamId ?? null,
      taskId: params.taskId ?? null,
      targetType: params.targetType,
      targetId: params.targetId,
      action: params.action,
      reason: params.reason ?? null,
      payload: params.payload as Prisma.InputJsonValue,
      expiresAt,
    },
    include: {
      decider: { select: { name: true } },
      team: { select: { slug: true } },
      task: { select: { title: true } },
    },
  });
  for (const userId of [...new Set(params.notifyUserIds ?? [])]) {
    if (!userId) continue;
    void notifyUser({
      userId,
      kind: "agent_confirmation_required",
      title: "Agent action requires confirmation",
      body: `Agent request pending: ${params.action}${created.task?.title ? ` on “${created.task.title}”` : ""}.`,
      metadata: { confirmationRequestId: created.id, teamSlug: created.team?.slug ?? params.teamSlug, taskId: params.taskId, action: params.action },
    });
    void dispatchWebhookEvent(userId, "agent.confirmation_required", {
      confirmationRequestId: created.id,
      action: params.action,
      teamSlug: created.team?.slug ?? params.teamSlug,
      taskId: params.taskId,
    });
  }
  return toAgentConfirmationDto({
    ...created,
    decidedByName: created.decider?.name,
    teamSlug: created.team?.slug,
    taskTitle: created.task?.title,
  });
}

async function assertTeamTaskMutateAllowed(params: {
  teamSlug: string;
  actorUserId: string;
  taskId: string;
  op: "update" | "delete";
}): Promise<{ teamId: string }> {
  const { teamId, role } = await assertTeamMemberRoleBySlug(params.teamSlug, params.actorUserId);
  if (role === "owner" || role === "admin") {
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
    if (role === "reviewer") {
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
  if (role === "reviewer") {
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
    case "team_task_ready_for_review":
    case "team_task_reviewed":
    case "agent_confirmation_required":
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
  agentBindingId?: string;
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
        agentBindingId: params.agentBindingId ?? null,
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

function toMcpInvokeAuditRow(row: {
  id: string;
  tool: string;
  userId: string;
  apiKeyId?: string | null;
  agentBindingId?: string | null;
  httpStatus: number;
  clientIp?: string | null;
  userAgent?: string | null;
  errorCode?: string | null;
  durationMs?: number | null;
  createdAt: Date | string;
}): McpInvokeAuditRow {
  return {
    id: row.id,
    tool: row.tool,
    userId: row.userId,
    apiKeyId: row.apiKeyId ?? undefined,
    agentBindingId: row.agentBindingId ?? undefined,
    httpStatus: row.httpStatus,
    clientIp: row.clientIp ?? undefined,
    userAgent: row.userAgent ?? undefined,
    errorCode: row.errorCode ?? undefined,
    durationMs: row.durationMs ?? undefined,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
  };
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
  tool?: string;
  status?: "success" | "error";
  agentBindingId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
}): Promise<{ items: McpInvokeAuditRow[]; total: number }> {
  if (useMockData) {
    const filtered = mockMcpInvokeAudits.filter((item) => {
      if (params.tool && item.tool !== params.tool) return false;
      if (params.status === "success" && item.httpStatus >= 400) return false;
      if (params.status === "error" && item.httpStatus < 400) return false;
      if (params.agentBindingId && item.agentBindingId !== params.agentBindingId) return false;
      if (params.dateFrom && new Date(item.createdAt) < new Date(params.dateFrom)) return false;
      if (params.dateTo && new Date(item.createdAt) > new Date(params.dateTo)) return false;
      return true;
    });
    const pageItems = paginateArray(filtered, params.page, params.limit);
    return { items: pageItems.items, total: pageItems.pagination.total };
  }
  const prisma = await getPrisma();
  const take = Math.min(Math.max(params.limit, 1), 100);
  const skip = (Math.max(params.page, 1) - 1) * take;
  const where: Prisma.McpInvokeAuditWhereInput = {
    ...(params.tool ? { tool: params.tool } : {}),
    ...(params.agentBindingId ? { agentBindingId: params.agentBindingId } : {}),
    ...(params.status === "success" ? { httpStatus: { lt: 400 } } : {}),
    ...(params.status === "error" ? { httpStatus: { gte: 400 } } : {}),
    ...((params.dateFrom || params.dateTo)
      ? {
          createdAt: {
            ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
            ...(params.dateTo ? { lte: new Date(params.dateTo) } : {}),
          },
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.mcpInvokeAudit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.mcpInvokeAudit.count({ where }),
  ]);
  return {
    items: rows.map((r) => toMcpInvokeAuditRow(r)),
    total,
  };
}

export async function getApiKeyUsageForUser(params: {
  userId: string;
  keyId: string;
  days?: number;
  limit?: number;
}): Promise<ApiKeyUsageSnapshot> {
  const days = Number.isFinite(params.days) ? Math.trunc(params.days as number) : 7;
  const limit = Number.isFinite(params.limit) ? Math.trunc(params.limit as number) : 100;

  if (useMockData) {
    const key = mockApiKeys.find((item) => item.id === params.keyId && item.userId === params.userId);
    if (!key) {
      throw new Error("API_KEY_NOT_FOUND");
    }
    return createApiKeyUsageSnapshot({
      rows: [],
      lastUsedAt: key.lastUsedAt,
      days,
      limit,
    });
  }

  const prisma = await getPrisma();
  const key = await prisma.apiKey.findFirst({
    where: { id: params.keyId, userId: params.userId },
    select: { id: true, lastUsedAt: true },
  });
  if (!key) {
    throw new Error("API_KEY_NOT_FOUND");
  }

  const now = new Date();
  const windowDays = Math.min(Math.max(days || 7, 1), 30);
  const recentLimit = Math.min(Math.max(limit || 100, 1), 100);
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (windowDays - 1)));

  const [windowRows, recentRows] = await Promise.all([
    prisma.mcpInvokeAudit.findMany({
      where: { apiKeyId: params.keyId, userId: params.userId, createdAt: { gte: periodStart } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mcpInvokeAudit.findMany({
      where: { apiKeyId: params.keyId, userId: params.userId },
      orderBy: { createdAt: "desc" },
      take: recentLimit,
    }),
  ]);

  return createApiKeyUsageSnapshot({
    rows: windowRows.map((row) => toMcpInvokeAuditRow(row)),
    recentInvocations: recentRows.map((row) => toMcpInvokeAuditRow(row)),
    lastUsedAt: key.lastUsedAt?.toISOString(),
    now,
    days: windowDays,
    limit: recentLimit,
  });
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
      reviewedBy: { select: { id: true, name: true } },
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
    reviewRequestedAt: r.reviewRequestedAt?.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString(),
    reviewedByUserId: r.reviewedBy?.id,
    reviewedByName: r.reviewedBy?.name,
    reviewNote: r.reviewNote ?? undefined,
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
      reviewedBy: { select: { id: true, name: true } },
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
    reviewRequestedAt: r.reviewRequestedAt?.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString(),
    reviewedByUserId: r.reviewedBy?.id,
    reviewedByName: r.reviewedBy?.name,
    reviewNote: r.reviewNote ?? undefined,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function listTeamDiscussions(params: {
  teamSlug: string;
  viewerUserId: string;
  page: number;
  limit: number;
}): Promise<Paginated<TeamDiscussion>> {
  const { teamId } = await assertTeamMemberBySlug(params.teamSlug, params.viewerUserId);

  if (useMockData) {
    const rows = mockTeamDiscussions
      .filter((item) => item.teamId === teamId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return paginateArray(rows, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const [rows, total] = await Promise.all([
    prisma.teamDiscussion.findMany({
      where: { teamId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      include: { author: { select: { name: true } } },
    }),
    prisma.teamDiscussion.count({ where: { teamId } }),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      teamId: row.teamId,
      authorId: row.authorId,
      authorName: row.author.name,
      title: row.title,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function createTeamDiscussion(params: {
  teamSlug: string;
  actorUserId: string;
  title: string;
  body: string;
}): Promise<TeamDiscussion> {
  const { teamId } = await assertTeamMemberBySlug(params.teamSlug, params.actorUserId);
  const title = params.title.trim().slice(0, 120);
  const body = params.body.trim().slice(0, 4000);
  if (!title) throw new Error("INVALID_TEAM_DISCUSSION_TITLE");
  if (!body) throw new Error("INVALID_TEAM_DISCUSSION_BODY");
  const now = new Date().toISOString();

  if (useMockData) {
    const author = mockUsers.find((item) => item.id === params.actorUserId);
    const row: TeamDiscussion = {
      id: `td_${teamId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId,
      authorId: params.actorUserId,
      authorName: author?.name ?? "Unknown",
      title,
      body,
      createdAt: now,
      updatedAt: now,
    };
    mockTeamDiscussions.unshift(row);
    mockAuditLogs.unshift({
      id: `log_td_${Date.now()}`,
      actorId: params.actorUserId,
      action: "team_discussion_created",
      entityType: "team_discussion",
      entityId: row.id,
      metadata: { teamId },
      createdAt: now,
    });
    return row;
  }

  const prisma = await getPrisma();
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.teamDiscussion.create({
      data: { teamId, authorId: params.actorUserId, title, body },
      include: { author: { select: { name: true } } },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.actorUserId,
        action: "team_discussion_created",
        entityType: "team_discussion",
        entityId: created.id,
        metadata: { teamId },
      },
    });
    return created;
  });
  return {
    id: row.id,
    teamId: row.teamId,
    authorId: row.authorId,
    authorName: row.author.name,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listTeamTaskComments(params: {
  teamSlug: string;
  taskId: string;
  viewerUserId: string;
}): Promise<TeamTaskComment[]> {
  const { teamId } = await assertTeamMemberBySlug(params.teamSlug, params.viewerUserId);

  if (useMockData) {
    if (!mockTeamTasks.some((item) => item.id === params.taskId && item.teamId === teamId)) {
      throw new Error("TEAM_TASK_NOT_FOUND");
    }
    return mockTeamTaskComments
      .filter((item) => item.teamId === teamId && item.taskId === params.taskId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  const prisma = await getPrisma();
  const rows = await prisma.teamTaskComment.findMany({
    where: { teamId, taskId: params.taskId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    teamId: row.teamId,
    taskId: row.taskId,
    authorId: row.authorId,
    authorName: row.author.name,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createTeamTaskComment(params: {
  teamSlug: string;
  taskId: string;
  actorUserId: string;
  body: string;
}): Promise<TeamTaskComment> {
  const { teamId } = await assertTeamMemberBySlug(params.teamSlug, params.actorUserId);
  const body = params.body.trim().slice(0, 2000);
  if (!body) throw new Error("INVALID_TEAM_TASK_COMMENT_BODY");
  const now = new Date().toISOString();

  if (useMockData) {
    if (!mockTeamTasks.some((item) => item.id === params.taskId && item.teamId === teamId)) {
      throw new Error("TEAM_TASK_NOT_FOUND");
    }
    const author = mockUsers.find((item) => item.id === params.actorUserId);
    const row: TeamTaskComment = {
      id: `ttc_${teamId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId,
      taskId: params.taskId,
      authorId: params.actorUserId,
      authorName: author?.name ?? "Unknown",
      body,
      createdAt: now,
      updatedAt: now,
    };
    mockTeamTaskComments.push(row);
    mockAuditLogs.unshift({
      id: `log_ttc_${Date.now()}`,
      actorId: params.actorUserId,
      action: "team_task_comment_created",
      entityType: "team_task_comment",
      entityId: row.id,
      metadata: { teamId, taskId: params.taskId },
      createdAt: now,
    });
    return row;
  }

  const prisma = await getPrisma();
  const existingTask = await prisma.teamTask.findFirst({
    where: { id: params.taskId, teamId },
    select: { id: true },
  });
  if (!existingTask) throw new Error("TEAM_TASK_NOT_FOUND");
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.teamTaskComment.create({
      data: { teamId, taskId: params.taskId, authorId: params.actorUserId, body },
      include: { author: { select: { name: true } } },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.actorUserId,
        action: "team_task_comment_created",
        entityType: "team_task_comment",
        entityId: created.id,
        metadata: { teamId, taskId: params.taskId },
      },
    });
    return created;
  });
  return {
    id: row.id,
    teamId: row.teamId,
    taskId: row.taskId,
    authorId: row.authorId,
    authorName: row.author.name,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listTeamTaskActivity(params: {
  teamSlug: string;
  taskId: string;
  viewerUserId: string;
}): Promise<TeamActivityLogEntry[]> {
  const { teamId } = await assertTeamMemberBySlug(params.teamSlug, params.viewerUserId);

  if (useMockData) {
    if (!mockTeamTasks.some((item) => item.id === params.taskId && item.teamId === teamId)) {
      throw new Error("TEAM_TASK_NOT_FOUND");
    }
    return mockAuditLogs
      .filter((log) => {
        const meta = log.metadata as Record<string, unknown> | undefined;
        return meta?.teamId === teamId && (log.entityId === params.taskId || meta?.taskId === params.taskId);
      })
      .map((log) => {
        const metadata = log.metadata as Record<string, unknown> | undefined;
        const kind = classifyTeamActivityEntry({ entityType: log.entityType, action: log.action });
        return {
          id: log.id,
          kind,
          actorId: log.actorId,
          actorName: mockUsers.find((item) => item.id === log.actorId)?.name,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          metadata,
          summary: summarizeTeamActivityEntry({ kind, action: log.action, metadata }),
          createdAt: log.createdAt,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const prisma = await getPrisma();
  const existingTask = await prisma.teamTask.findFirst({
    where: { id: params.taskId, teamId },
    select: { id: true },
  });
  if (!existingTask) throw new Error("TEAM_TASK_NOT_FOUND");
  const rows = await prisma.auditLog.findMany({
    where: {
      metadata: { path: ["teamId"], equals: teamId },
      OR: [
        { entityId: params.taskId },
        { metadata: { path: ["taskId"], equals: params.taskId } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
    take: 100,
  });
  return rows.map((log) => {
    const metadata = log.metadata as Record<string, unknown> | undefined;
    const kind = classifyTeamActivityEntry({ entityType: log.entityType, action: log.action });
    return {
      id: log.id,
      kind,
      actorId: log.actorId,
      actorName: log.actor.name,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata,
      summary: summarizeTeamActivityEntry({ kind, action: log.action, metadata }),
      createdAt: log.createdAt.toISOString(),
    };
  });
}

async function listTeamReviewerUserIds(teamId: string): Promise<string[]> {
  if (useMockData) {
    return mockTeamMemberships
      .filter((item) => item.teamId === teamId && canReviewTasks(item.role))
      .map((item) => item.userId);
  }
  const prisma = await getPrisma();
  const rows = await prisma.teamMembership.findMany({
    where: { teamId, role: { in: ["owner", "admin", "reviewer"] } },
    select: { userId: true },
  });
  return rows.map((item) => item.userId);
}

export async function listAgentActionAuditsForUser(params: {
  userId: string;
  page: number;
  limit: number;
}): Promise<Paginated<AgentActionAuditRow>> {
  if (useMockData) {
    return paginateArray(
      mockAgentActionAudits.filter((item) => item.actorUserId === params.userId),
      params.page,
      params.limit
    );
  }
  const prisma = await getPrisma();
  const where = { actorUserId: params.userId };
  const [rows, total] = await Promise.all([
    prisma.agentActionAudit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.agentActionAudit.count({ where }),
  ]);
  return {
    items: rows.map((row) => toAgentActionAuditDto(row)),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

/**
 * Team-scoped agent-action audit timeline (W3).
 * Caller must already be a team member; the assertion is done here so API
 * routes don't have to duplicate the check.
 */
export async function listAgentActionAuditsForTeam(params: {
  teamSlug: string;
  viewerUserId: string;
  agentBindingId?: string;
  page: number;
  limit: number;
}): Promise<Paginated<AgentActionAuditRow>> {
  const { teamId } = await assertTeamMemberRoleBySlug(
    params.teamSlug,
    params.viewerUserId
  );

  if (useMockData) {
    const filtered = mockAgentActionAudits.filter(
      (item) =>
        item.teamId === teamId &&
        (!params.agentBindingId ||
          item.agentBindingId === params.agentBindingId)
    );
    return paginateArray(filtered, params.page, params.limit);
  }
  const prisma = await getPrisma();
  const where: {
    teamId: string;
    agentBindingId?: string;
  } = { teamId };
  if (params.agentBindingId) where.agentBindingId = params.agentBindingId;
  const [rows, total] = await Promise.all([
    prisma.agentActionAudit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.agentActionAudit.count({ where }),
  ]);
  return {
    items: rows.map((row) => toAgentActionAuditDto(row)),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function listAgentConfirmationRequestsForUser(params: {
  userId: string;
  page: number;
  limit: number;
  status?: AgentConfirmationStatus;
}): Promise<Paginated<AgentConfirmationRequest>> {
  if (useMockData) {
    const reviewableTeamIds = new Set(
      mockTeamMemberships
        .filter((item) => item.userId === params.userId && canReviewTasks(item.role))
        .map((item) => item.teamId)
    );
    const filtered = mockAgentConfirmationRequests
      .filter((item) => item.requesterUserId === params.userId || (item.teamId && reviewableTeamIds.has(item.teamId)))
      .filter((item) => !params.status || item.status === params.status);
    return paginateArray(filtered, params.page, params.limit);
  }
  const prisma = await getPrisma();
  const memberships = await prisma.teamMembership.findMany({
    where: { userId: params.userId, role: { in: ["owner", "admin", "reviewer"] } },
    select: { teamId: true },
  });
  const teamIds = memberships.map((item) => item.teamId);
  const where: Prisma.AgentConfirmationRequestWhereInput = {
    OR: [
      { requesterUserId: params.userId },
      ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
    ],
    ...(params.status ? { status: params.status } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.agentConfirmationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      include: {
        decider: { select: { name: true } },
        team: { select: { slug: true } },
        task: { select: { title: true } },
      },
    }),
    prisma.agentConfirmationRequest.count({ where }),
  ]);
  return {
    items: rows.map((row) =>
      toAgentConfirmationDto({
        ...row,
        decidedByName: row.decider?.name,
        teamSlug: row.team?.slug,
        taskTitle: row.task?.title,
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

export async function agentCompleteTeamTask(params: {
  teamSlug: string;
  taskId: string;
  actorUserId: string;
  agentBindingId: string;
  apiKeyId?: string;
}): Promise<TeamTask> {
  await assertActiveAgentBindingForUser({ userId: params.actorUserId, agentBindingId: params.agentBindingId });
  const { teamId } = await assertTeamTaskMutateAllowed({
    teamSlug: params.teamSlug,
    actorUserId: params.actorUserId,
    taskId: params.taskId,
    op: "update",
  });
  const now = new Date().toISOString();
  if (useMockData) {
    const row = mockTeamTasks.find((item) => item.id === params.taskId && item.teamId === teamId);
    if (!row) throw new Error("TEAM_TASK_NOT_FOUND");
    row.status = "review";
    row.reviewRequestedAt = now;
    row.reviewedAt = undefined;
    row.reviewedByUserId = undefined;
    row.reviewNote = undefined;
    row.updatedAt = now;
    mockAuditLogs.unshift({
      id: `log_tt_review_${Date.now()}`,
      actorId: params.actorUserId,
      agentBindingId: params.agentBindingId,
      action: "team_task_sent_for_review",
      entityType: "team_task",
      entityId: row.id,
      metadata: { teamId, taskId: row.id, byAgent: true },
      createdAt: now,
    });
    await recordAgentActionAudit({
      actorUserId: params.actorUserId,
      agentBindingId: params.agentBindingId,
      apiKeyId: params.apiKeyId,
      teamId,
      taskId: row.id,
      action: "team_task_complete",
      outcome: "succeeded",
      metadata: { nextStatus: "review" },
    });
    const team = mockTeams.find((item) => item.id === teamId);
    const recipients = (await listTeamReviewerUserIds(teamId)).filter((userId) => userId !== params.actorUserId);
    for (const userId of recipients) {
      void notifyUser({
        userId,
        kind: "team_task_ready_for_review",
        title: "Task ready for review",
        body: `${userNameById(params.actorUserId)} submitted “${row.title}” for review.`,
        metadata: { teamSlug: team?.slug ?? params.teamSlug, taskId: row.id },
      });
      void dispatchWebhookEvent(userId, "team.task_ready_for_review", {
        teamSlug: team?.slug ?? params.teamSlug,
        taskId: row.id,
        taskTitle: row.title,
      });
    }
    return mockTeamTaskToDto(row);
  }

  const prisma = await getPrisma();
  const existing = await prisma.teamTask.findFirst({
    where: { id: params.taskId, teamId },
    select: { id: true, title: true },
  });
  if (!existing) throw new Error("TEAM_TASK_NOT_FOUND");
  const updated = await prisma.$transaction(async (tx) => {
    const task = await tx.teamTask.update({
      where: { id: params.taskId },
      data: {
        status: "review",
        reviewRequestedAt: new Date(),
        reviewedAt: null,
        reviewedByUserId: null,
        reviewNote: null,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true } },
        milestone: { select: { id: true, title: true } },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.actorUserId,
        agentBindingId: params.agentBindingId,
        action: "team_task_sent_for_review",
        entityType: "team_task",
        entityId: task.id,
        metadata: { teamId, taskId: task.id, byAgent: true },
      },
    });
    return task;
  });
  await recordAgentActionAudit({
    actorUserId: params.actorUserId,
    agentBindingId: params.agentBindingId,
    apiKeyId: params.apiKeyId,
    teamId,
    taskId: updated.id,
    action: "team_task_complete",
    outcome: "succeeded",
    metadata: { nextStatus: "review" },
  });
  const [team, recipientIds] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId }, select: { slug: true } }),
    listTeamReviewerUserIds(teamId),
  ]);
  for (const userId of recipientIds.filter((userId) => userId !== params.actorUserId)) {
    void notifyUser({
      userId,
      kind: "team_task_ready_for_review",
      title: "Task ready for review",
      body: `${updated.assignee?.name ?? userNameById(params.actorUserId)} submitted “${updated.title}” for review.`,
      metadata: { teamSlug: team?.slug ?? params.teamSlug, taskId: updated.id },
    });
    void dispatchWebhookEvent(userId, "team.task_ready_for_review", {
      teamSlug: team?.slug ?? params.teamSlug,
      taskId: updated.id,
      taskTitle: updated.title,
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
    reviewRequestedAt: updated.reviewRequestedAt?.toISOString(),
    reviewedAt: updated.reviewedAt?.toISOString(),
    reviewedByUserId: updated.reviewedBy?.id,
    reviewedByName: updated.reviewedBy?.name,
    reviewNote: updated.reviewNote ?? undefined,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function requestAgentTaskReview(params: {
  teamSlug: string;
  taskId: string;
  actorUserId: string;
  agentBindingId: string;
  apiKeyId?: string;
  approved: boolean;
  reviewNote?: string;
}): Promise<AgentConfirmationRequest> {
  await assertActiveAgentBindingForUser({ userId: params.actorUserId, agentBindingId: params.agentBindingId });
  const { teamId, role } = await assertTeamMemberRoleBySlug(params.teamSlug, params.actorUserId);
  if (!canReviewTasks(role)) {
    throw new Error("FORBIDDEN_TASK_REVIEW");
  }
  const note = params.reviewNote?.trim().slice(0, 1000) || undefined;
  if (useMockData) {
    const row = mockTeamTasks.find((item) => item.id === params.taskId && item.teamId === teamId);
    if (!row) throw new Error("TEAM_TASK_NOT_FOUND");
    if (row.status !== "review") throw new Error("TEAM_TASK_NOT_IN_REVIEW");
    const recipients = (await listTeamReviewerUserIds(teamId)).filter((userId) => userId !== params.actorUserId);
    const request = await createAgentConfirmationRequest({
      requesterUserId: params.actorUserId,
      agentBindingId: params.agentBindingId,
      apiKeyId: params.apiKeyId,
      teamId,
      taskId: row.id,
      teamSlug: params.teamSlug,
      taskTitle: row.title,
      targetType: "team_task",
      targetId: row.id,
      action: params.approved ? "team_task_review_approve" : "team_task_review_reject",
      reason: note,
      payload: { reviewNote: note ?? null, nextStatus: params.approved ? "done" : "rejected" },
      notifyUserIds: recipients,
    });
    await recordAgentActionAudit({
      actorUserId: params.actorUserId,
      agentBindingId: params.agentBindingId,
      apiKeyId: params.apiKeyId,
      teamId,
      taskId: row.id,
      action: request.action,
      outcome: "confirmation_required",
      metadata: { reviewNote: note ?? null },
    });
    return request;
  }
  const prisma = await getPrisma();
  const row = await prisma.teamTask.findFirst({
    where: { id: params.taskId, teamId },
    select: { id: true, title: true, status: true },
  });
  if (!row) throw new Error("TEAM_TASK_NOT_FOUND");
  if (row.status !== "review") throw new Error("TEAM_TASK_NOT_IN_REVIEW");
  const recipientIds = (await listTeamReviewerUserIds(teamId)).filter((userId) => userId !== params.actorUserId);
  const request = await createAgentConfirmationRequest({
    requesterUserId: params.actorUserId,
    agentBindingId: params.agentBindingId,
    apiKeyId: params.apiKeyId,
    teamId,
    taskId: row.id,
    teamSlug: params.teamSlug,
    taskTitle: row.title,
    targetType: "team_task",
    targetId: row.id,
    action: params.approved ? "team_task_review_approve" : "team_task_review_reject",
    reason: note,
    payload: { reviewNote: note ?? null, nextStatus: params.approved ? "done" : "rejected" },
    notifyUserIds: recipientIds,
  });
  await recordAgentActionAudit({
    actorUserId: params.actorUserId,
    agentBindingId: params.agentBindingId,
    apiKeyId: params.apiKeyId,
    teamId,
    taskId: row.id,
    action: request.action,
    outcome: "confirmation_required",
    metadata: { reviewNote: note ?? null },
  });
  return request;
}

export async function requestAgentTaskDelete(params: {
  teamSlug: string;
  taskId: string;
  actorUserId: string;
  agentBindingId: string;
  apiKeyId?: string;
  reason?: string;
}): Promise<AgentConfirmationRequest> {
  await assertActiveAgentBindingForUser({ userId: params.actorUserId, agentBindingId: params.agentBindingId });
  const { teamId, role } = await assertTeamMemberRoleBySlug(params.teamSlug, params.actorUserId);
  if (!(role === "owner" || role === "admin")) {
    throw new Error("FORBIDDEN_TASK_DELETE");
  }
  const reason = params.reason?.trim().slice(0, 500) || undefined;
  if (useMockData) {
    const row = mockTeamTasks.find((item) => item.id === params.taskId && item.teamId === teamId);
    if (!row) throw new Error("TEAM_TASK_NOT_FOUND");
    const request = await createAgentConfirmationRequest({
      requesterUserId: params.actorUserId,
      agentBindingId: params.agentBindingId,
      apiKeyId: params.apiKeyId,
      teamId,
      taskId: row.id,
      teamSlug: params.teamSlug,
      taskTitle: row.title,
      targetType: "team_task",
      targetId: row.id,
      action: "team_task_delete",
      reason,
      payload: { reason: reason ?? null },
      notifyUserIds: [params.actorUserId],
    });
    await recordAgentActionAudit({
      actorUserId: params.actorUserId,
      agentBindingId: params.agentBindingId,
      apiKeyId: params.apiKeyId,
      teamId,
      taskId: row.id,
      action: request.action,
      outcome: "confirmation_required",
      metadata: { reason: reason ?? null },
    });
    return request;
  }
  const prisma = await getPrisma();
  const row = await prisma.teamTask.findFirst({
    where: { id: params.taskId, teamId },
    select: { id: true, title: true },
  });
  if (!row) throw new Error("TEAM_TASK_NOT_FOUND");
  const request = await createAgentConfirmationRequest({
    requesterUserId: params.actorUserId,
    agentBindingId: params.agentBindingId,
    apiKeyId: params.apiKeyId,
    teamId,
    taskId: row.id,
    teamSlug: params.teamSlug,
    taskTitle: row.title,
    targetType: "team_task",
    targetId: row.id,
    action: "team_task_delete",
    reason,
    payload: { reason: reason ?? null },
    notifyUserIds: [params.actorUserId],
  });
  await recordAgentActionAudit({
    actorUserId: params.actorUserId,
    agentBindingId: params.agentBindingId,
    apiKeyId: params.apiKeyId,
    teamId,
    taskId: row.id,
    action: request.action,
    outcome: "confirmation_required",
    metadata: { reason: reason ?? null },
  });
  return request;
}

export async function requestAgentTeamMemberRoleChange(params: {
  teamSlug: string;
  memberUserId: string;
  nextRole: TeamRole;
  actorUserId: string;
  agentBindingId: string;
  apiKeyId?: string;
  reason?: string;
}): Promise<AgentConfirmationRequest> {
  await assertActiveAgentBindingForUser({ userId: params.actorUserId, agentBindingId: params.agentBindingId });
  const { teamId, role } = await assertTeamMemberRoleBySlug(params.teamSlug, params.actorUserId);
  if (!canManageTeamMembership(role)) throw new Error("FORBIDDEN_NOT_OWNER");
  if (params.nextRole === "owner") throw new Error("INVALID_TEAM_ROLE");
  const reason = params.reason?.trim().slice(0, 500) || undefined;
  const team = useMockData
    ? mockTeams.find((item) => item.id === teamId)
    : await (await getPrisma()).team.findUnique({ where: { id: teamId }, select: { slug: true } });
  const request = await createAgentConfirmationRequest({
    requesterUserId: params.actorUserId,
    agentBindingId: params.agentBindingId,
    apiKeyId: params.apiKeyId,
    teamId,
    teamSlug: team?.slug ?? params.teamSlug,
    targetType: "team_member",
    targetId: params.memberUserId,
    action: "team_member_role_update",
    reason,
    payload: { memberUserId: params.memberUserId, role: params.nextRole },
    notifyUserIds: [params.actorUserId],
  });
  await recordAgentActionAudit({
    actorUserId: params.actorUserId,
    agentBindingId: params.agentBindingId,
    apiKeyId: params.apiKeyId,
    teamId,
    action: request.action,
    outcome: "confirmation_required",
    metadata: { memberUserId: params.memberUserId, role: params.nextRole },
  });
  return request;
}

export async function decideAgentConfirmationRequest(params: {
  requestId: string;
  deciderUserId: string;
  decision: "approved" | "rejected";
}): Promise<AgentConfirmationRequest> {
  const now = new Date();
  if (useMockData) {
    const row = mockAgentConfirmationRequests.find((item) => item.id === params.requestId);
    if (!row) throw new Error("AGENT_CONFIRMATION_NOT_FOUND");
    if (row.status !== "pending") throw new Error("AGENT_CONFIRMATION_NOT_PENDING");
    if (row.teamId) {
      const membership = mockTeamMemberships.find((item) => item.teamId === row.teamId && item.userId === params.deciderUserId);
      if (!membership) throw new Error("FORBIDDEN_NOT_TEAM_MEMBER");
      if (row.action === "team_task_delete" || row.action === "team_member_role_update") {
        if (!canManageTeamMembership(membership.role)) throw new Error("FORBIDDEN_AGENT_CONFIRMATION");
      } else if (!canReviewTasks(membership.role)) {
        throw new Error("FORBIDDEN_AGENT_CONFIRMATION");
      }
    } else if (row.requesterUserId !== params.deciderUserId) {
      throw new Error("FORBIDDEN_AGENT_CONFIRMATION");
    }
    row.status = params.decision;
    row.decidedByUserId = params.deciderUserId;
    row.decidedByName = userNameById(params.deciderUserId);
    row.decidedAt = now.toISOString();
    if (params.decision === "approved") {
      if (row.action === "team_task_review_approve" || row.action === "team_task_review_reject") {
        const task = mockTeamTasks.find((item) => item.id === row.taskId && item.teamId === row.teamId);
        if (!task) throw new Error("TEAM_TASK_NOT_FOUND");
        task.status = row.action === "team_task_review_approve" ? "done" : "rejected";
        task.reviewedAt = now.toISOString();
        task.reviewedByUserId = params.deciderUserId;
        task.reviewNote = typeof row.payload.reviewNote === "string" ? row.payload.reviewNote : undefined;
        task.updatedAt = now.toISOString();
        const team = mockTeams.find((item) => item.id === row.teamId);
        for (const userId of [task.createdByUserId, task.assigneeUserId].filter(Boolean) as string[]) {
          if (userId === params.deciderUserId) continue;
          void notifyUser({
            userId,
            kind: "team_task_reviewed",
            title: "Task review completed",
            body: `“${task.title}” was ${task.status === "done" ? "approved" : "sent back"} by ${userNameById(params.deciderUserId)}.`,
            metadata: { teamSlug: team?.slug ?? row.teamSlug, taskId: task.id },
          });
          void dispatchWebhookEvent(userId, "team.task_reviewed", {
            teamSlug: team?.slug ?? row.teamSlug,
            taskId: task.id,
            taskTitle: task.title,
            status: task.status,
          });
        }
      } else if (row.action === "team_task_delete") {
        await deleteTeamTask({ teamSlug: row.teamSlug ?? "", taskId: row.targetId, actorUserId: params.deciderUserId });
      } else if (row.action === "team_member_role_update") {
        const nextRole = typeof row.payload.role === "string" ? (row.payload.role as TeamRole) : "member";
        await updateTeamMemberRole({
          teamSlug: row.teamSlug ?? "",
          actorUserId: params.deciderUserId,
          memberUserId: row.targetId,
          role: nextRole,
        });
      }
      await recordAgentActionAudit({
        actorUserId: row.requesterUserId,
        agentBindingId: row.agentBindingId,
        apiKeyId: row.apiKeyId,
        teamId: row.teamId,
        taskId: row.taskId,
        action: row.action,
        outcome: "succeeded",
        metadata: { decidedByUserId: params.deciderUserId },
      });
    } else {
      await recordAgentActionAudit({
        actorUserId: row.requesterUserId,
        agentBindingId: row.agentBindingId,
        apiKeyId: row.apiKeyId,
        teamId: row.teamId,
        taskId: row.taskId,
        action: row.action,
        outcome: "rejected",
        metadata: { decidedByUserId: params.deciderUserId },
      });
    }
    return row;
  }

  const prisma = await getPrisma();
  const existing = await prisma.agentConfirmationRequest.findUnique({
    where: { id: params.requestId },
    include: {
      team: { select: { slug: true } },
      task: { select: { title: true } },
      decider: { select: { name: true } },
    },
  });
  if (!existing) throw new Error("AGENT_CONFIRMATION_NOT_FOUND");
  if (existing.status !== "pending") throw new Error("AGENT_CONFIRMATION_NOT_PENDING");
  if (existing.teamId) {
    const membership = await prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId: existing.teamId, userId: params.deciderUserId } },
      select: { role: true },
    });
    if (!membership) throw new Error("FORBIDDEN_NOT_TEAM_MEMBER");
    if (existing.action === "team_task_delete" || existing.action === "team_member_role_update") {
      if (!canManageTeamMembership(membership.role as TeamRole)) throw new Error("FORBIDDEN_AGENT_CONFIRMATION");
    } else if (!canReviewTasks(membership.role as TeamRole)) {
      throw new Error("FORBIDDEN_AGENT_CONFIRMATION");
    }
  } else if (existing.requesterUserId !== params.deciderUserId) {
    throw new Error("FORBIDDEN_AGENT_CONFIRMATION");
  }

  const decision = params.decision;
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.agentConfirmationRequest.update({
      where: { id: existing.id },
      data: {
        status: decision,
        decidedByUserId: params.deciderUserId,
        decidedAt: now,
      },
      include: {
        team: { select: { slug: true } },
        task: { select: { title: true } },
        decider: { select: { name: true } },
      },
    });
    if (decision === "approved") {
      if (row.action === "team_task_review_approve" || row.action === "team_task_review_reject") {
        const task = await tx.teamTask.update({
          where: { id: row.targetId },
          data: {
            status: row.action === "team_task_review_approve" ? "done" : "rejected",
            reviewedAt: now,
            reviewedByUserId: params.deciderUserId,
            reviewNote:
              row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
                ? (((row.payload as Record<string, unknown>).reviewNote as string | null | undefined) ?? null)
                : null,
          },
          include: {
            createdBy: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
            team: { select: { slug: true } },
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: params.deciderUserId,
            action: "team_task_review_confirmed",
            entityType: "team_task",
            entityId: task.id,
            metadata: { teamId: task.teamId, status: task.status, agentBindingId: row.agentBindingId },
          },
        });
        for (const userId of [task.createdBy.id, task.assignee?.id].filter(Boolean) as string[]) {
          if (userId === params.deciderUserId) continue;
          void notifyUser({
            userId,
            kind: "team_task_reviewed",
            title: "Task review completed",
            body: `“${task.title}” was ${task.status === "done" ? "approved" : "sent back"} by ${task.team.slug}.`,
            metadata: { teamSlug: task.team.slug, taskId: task.id },
          });
          void dispatchWebhookEvent(userId, "team.task_reviewed", {
            teamSlug: task.team.slug,
            taskId: task.id,
            taskTitle: task.title,
            status: task.status,
          });
        }
      } else if (row.action === "team_task_delete") {
        await tx.teamTask.delete({ where: { id: row.targetId } });
        await tx.auditLog.create({
          data: {
            actorId: params.deciderUserId,
            action: "team_task_deleted_via_confirmation",
            entityType: "team_task",
            entityId: row.targetId,
            metadata: { teamId: row.teamId, agentBindingId: row.agentBindingId },
          },
        });
      } else if (row.action === "team_member_role_update") {
        const payload = row.payload as Record<string, unknown>;
        const nextRole = typeof payload.role === "string" ? (payload.role as TeamRole) : "member";
        await tx.teamMembership.update({
          where: { teamId_userId: { teamId: row.teamId!, userId: row.targetId } },
          data: { role: nextRole },
        });
        await tx.auditLog.create({
          data: {
            actorId: params.deciderUserId,
            action: "team_member_role_updated_via_confirmation",
            entityType: "team",
            entityId: row.teamId!,
            metadata: { memberUserId: row.targetId, role: nextRole, agentBindingId: row.agentBindingId },
          },
        });
      }
    }
    return row;
  });
  await recordAgentActionAudit({
    actorUserId: updated.requesterUserId,
    agentBindingId: updated.agentBindingId,
    apiKeyId: updated.apiKeyId ?? undefined,
    teamId: updated.teamId ?? undefined,
    taskId: updated.taskId ?? undefined,
    action: updated.action,
    outcome: decision === "approved" ? "succeeded" : "rejected",
    metadata: { decidedByUserId: params.deciderUserId },
  });
  return toAgentConfirmationDto({
    ...updated,
    decidedByName: updated.decider?.name,
    teamSlug: updated.team?.slug,
    taskTitle: updated.task?.title,
  });
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
    params.status && isTeamTaskStatus(params.status) ? params.status : "todo";
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
      reviewRequestedAt: status === "review" ? now : undefined,
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
        reviewedBy: { select: { id: true, name: true } },
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
    reviewRequestedAt: created.reviewRequestedAt?.toISOString(),
    reviewedAt: created.reviewedAt?.toISOString(),
    reviewedByUserId: created.reviewedBy?.id,
    reviewedByName: created.reviewedBy?.name,
    reviewNote: created.reviewNote ?? undefined,
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
    mockAuditLogs.unshift({
      id: `log_tt_reorder_${Date.now()}`,
      actorId: params.actorUserId,
      action: "team_task_reordered",
      entityType: "team_task",
      entityId: row.id,
      metadata: { teamId, direction: params.direction },
      createdAt: now,
    });
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
    prisma.auditLog.create({
      data: {
        actorId: params.actorUserId,
        action: "team_task_reordered",
        entityType: "team_task",
        entityId: a.id,
        metadata: { teamId, direction: params.direction },
      },
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
      if (!isTeamTaskStatus(params.status)) {
        throw new Error("INVALID_TASK_STATUS");
      }
      cur.status = params.status;
      if (params.status === "review") {
        cur.reviewRequestedAt = new Date().toISOString();
        cur.reviewedAt = undefined;
        cur.reviewedByUserId = undefined;
        cur.reviewNote = undefined;
      } else if (params.status === "todo" || params.status === "doing") {
        cur.reviewRequestedAt = undefined;
        cur.reviewedAt = undefined;
        cur.reviewedByUserId = undefined;
        cur.reviewNote = undefined;
      }
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
    mockAuditLogs.unshift({
      id: `log_tt_update_${Date.now()}`,
      actorId: params.actorUserId,
      action: "team_task_updated",
      entityType: "team_task",
      entityId: cur.id,
      metadata: { teamId, status: cur.status, assigneeUserId: cur.assigneeUserId ?? null },
      createdAt: cur.updatedAt,
    });
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
    status?: TeamTaskStatus;
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
    if (!isTeamTaskStatus(params.status)) {
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
      reviewedBy: { select: { id: true, name: true } },
      milestone: { select: { id: true, title: true } },
    },
  });
  if (data.status === "review") {
    await prisma.teamTask.update({
      where: { id: updated.id },
      data: {
        reviewRequestedAt: new Date(),
        reviewedAt: null,
        reviewedByUserId: null,
        reviewNote: null,
      },
    });
    updated.reviewRequestedAt = new Date();
    updated.reviewedAt = null;
    updated.reviewedBy = null;
    updated.reviewNote = null;
  }
  await prisma.auditLog.create({
    data: {
      actorId: params.actorUserId,
      action: "team_task_updated",
      entityType: "team_task",
      entityId: updated.id,
      metadata: { teamId, status: updated.status, assigneeUserId: updated.assignee?.id ?? null },
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
    reviewRequestedAt: updated.reviewRequestedAt?.toISOString(),
    reviewedAt: updated.reviewedAt?.toISOString(),
    reviewedByUserId: updated.reviewedBy?.id,
    reviewedByName: updated.reviewedBy?.name,
    reviewNote: updated.reviewNote ?? undefined,
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
  if (!canReviewTasks(role)) {
    throw new Error("FORBIDDEN_BATCH_TASK_UPDATE");
  }
  if (!isTeamTaskStatus(params.status)) {
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
      mockAuditLogs.unshift({
        id: `log_tt_batch_${Date.now()}_${id}`,
        actorId: params.actorUserId,
        action: "team_task_status_changed",
        entityType: "team_task",
        entityId: id,
        metadata: { teamId, status: params.status },
        createdAt: now,
      });
      out.push(mockTeamTaskToDto(mockTeamTasks[idx]));
    }
    return out;
  }

  const prisma = await getPrisma();
  await prisma.teamTask.updateMany({
    where: { teamId, id: { in: ids } },
    data: { status: params.status },
  });
  await prisma.auditLog.createMany({
    data: ids.map((id) => ({
      actorId: params.actorUserId,
      action: "team_task_status_changed",
      entityType: "team_task",
      entityId: id,
      metadata: { teamId, status: params.status } as Prisma.JsonObject,
    })),
  });
  const rows = await prisma.teamTask.findMany({
    where: { teamId, id: { in: ids } },
    include: {
      createdBy: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true } },
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
    reviewRequestedAt: updated.reviewRequestedAt?.toISOString(),
    reviewedAt: updated.reviewedAt?.toISOString(),
    reviewedByUserId: updated.reviewedBy?.id,
    reviewedByName: updated.reviewedBy?.name,
    reviewNote: updated.reviewNote ?? undefined,
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
    mockAuditLogs.unshift({
      id: `log_tt_delete_${Date.now()}`,
      actorId: params.actorUserId,
      action: "team_task_deleted",
      entityType: "team_task",
      entityId: params.taskId,
      metadata: { teamId },
      createdAt: new Date().toISOString(),
    });
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
  await prisma.auditLog.create({
    data: {
      actorId: params.actorUserId,
      action: "team_task_deleted",
      entityType: "team_task",
      entityId: params.taskId,
      metadata: { teamId },
    },
  });
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
  // Owners/admins can edit all fields; members/reviewers can only update progress.
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
    const canManage = role === "owner" || role === "admin";
    if (!canManage) {
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
  const canManage = role === "owner" || role === "admin";
  if (!canManage) {
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
  const { teamId, role } = await assertTeamMemberRoleBySlug(params.teamSlug, params.actorUserId);
  if (!canManageTeamMembership(role)) {
    throw new Error("FORBIDDEN_NOT_OWNER");
  }

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
  sort?: "recent" | "recommended";
  viewerUserId?: string | null;
  page: number;
  limit: number;
}): Promise<Paginated<CreatorProfile>> {
  const sort = params.sort ?? "recent";
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

    const preferenceSkills = new Map<string, number>();
    if (params.viewerUserId) {
      for (const creator of mockCreators.filter((item) => item.userId === params.viewerUserId)) {
        for (const skill of creator.skills) preferenceSkills.set(skill, (preferenceSkills.get(skill) ?? 0) + 3);
      }
      for (const follow of mockUserFollows.filter((item) => item.followerId === params.viewerUserId)) {
        const creator = mockCreators.find((item) => item.userId === follow.followingId);
        if (!creator) continue;
        for (const skill of creator.skills) preferenceSkills.set(skill, (preferenceSkills.get(skill) ?? 0) + 2);
      }
    }

    const ranked = [...filtered].sort((a, b) => {
      if (sort === "recommended" && params.viewerUserId) {
        const scoreA = a.skills.reduce((sum, skill) => sum + (preferenceSkills.get(skill) ?? 0), 0);
        const scoreB = b.skills.reduce((sum, skill) => sum + (preferenceSkills.get(skill) ?? 0), 0);
        if (scoreA !== scoreB) return scoreB - scoreA;
      }
      return 0;
    });

    return paginateArray(ranked, params.page, params.limit);
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
    const ranked = rows
      .map((r) =>
        toCreatorDto({
          ...r,
          collaborationPreference: r.collaborationPreference as CreatorProfile["collaborationPreference"],
        })
      );
    return {
      items: ranked,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    };
  }

  const [items, total, viewerSkills, follows] = await Promise.all([
    prisma.creatorProfile.findMany({
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take,
    }),
    prisma.creatorProfile.count(),
    params.viewerUserId
      ? prisma.creatorProfile.findMany({
          where: { userId: params.viewerUserId },
          select: { skills: true },
          take: 5,
        })
      : Promise.resolve([]),
    params.viewerUserId
      ? prisma.userFollow.findMany({
          where: { followerId: params.viewerUserId },
          select: { followingId: true },
        })
      : Promise.resolve([]),
  ]);

  const skillWeights = new Map<string, number>();
  for (const row of viewerSkills) {
    for (const skill of row.skills) skillWeights.set(skill, (skillWeights.get(skill) ?? 0) + 3);
  }
  if (params.viewerUserId && follows.length > 0) {
    const followedCreators = await prisma.creatorProfile.findMany({
      where: { userId: { in: follows.map((item) => item.followingId) } },
      select: { skills: true },
      take: 50,
    });
    for (const creator of followedCreators) {
      for (const skill of creator.skills) skillWeights.set(skill, (skillWeights.get(skill) ?? 0) + 2);
    }
  }

  const ranked = items
    .map(toCreatorDto)
    .sort((a, b) => {
      if (sort === "recommended" && params.viewerUserId) {
        const scoreA = a.skills.reduce((sum, skill) => sum + (skillWeights.get(skill) ?? 0), 0);
        const scoreB = b.skills.reduce((sum, skill) => sum + (skillWeights.get(skill) ?? 0), 0);
        if (scoreA !== scoreB) return scoreB - scoreA;
      }
      return 0;
    });

  return {
    items: ranked,
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

export async function toggleProjectBookmark(userId: string, projectSlug: string): Promise<{ bookmarked: boolean; bookmarkCount: number }> {
  if (useMockData) {
    const project = mockProjects.find((p) => p.slug === projectSlug);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    const existing = mockProjectBookmarks.findIndex((b) => b.userId === userId && b.projectId === project.id);
    if (existing >= 0) {
      mockProjectBookmarks.splice(existing, 1);
      const bookmarkCount = mockProjectBookmarks.filter((b) => b.projectId === project.id).length;
      return { bookmarked: false, bookmarkCount };
    }
    mockProjectBookmarks.push({ id: `pbk_${Date.now()}`, userId, projectId: project.id, createdAt: new Date().toISOString() });
    const bookmarkCount = mockProjectBookmarks.filter((b) => b.projectId === project.id).length;
    return { bookmarked: true, bookmarkCount };
  }
  const prisma = await getPrisma();
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  const existing = await prisma.projectBookmark.findUnique({ where: { userId_projectId: { userId, projectId: project.id } } });
  if (existing) {
    await prisma.projectBookmark.delete({ where: { id: existing.id } });
    const bookmarkCount = await prisma.projectBookmark.count({ where: { projectId: project.id } });
    return { bookmarked: false, bookmarkCount };
  }
  await prisma.projectBookmark.create({ data: { userId, projectId: project.id } });
  const bookmarkCount = await prisma.projectBookmark.count({ where: { projectId: project.id } });
  return { bookmarked: true, bookmarkCount };
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

export async function getRecommendedPostFeed(
  userId: string | null,
  params: { page: number; limit: number }
): Promise<Paginated<Post>> {
  if (!userId) {
    return listPosts({ sort: "hot", page: params.page, limit: params.limit });
  }

  if (useMockData) {
    const interestTags = new Map<string, number>();
    for (const post of mockPosts.filter((item) => item.authorId === userId)) {
      for (const tag of post.tags) {
        interestTags.set(tag, (interestTags.get(tag) ?? 0) + 2);
      }
    }
    for (const like of mockPostLikes.filter((item) => item.userId === userId)) {
      const post = mockPosts.find((item) => item.id === like.postId);
      if (!post) continue;
      for (const tag of post.tags) {
        interestTags.set(tag, (interestTags.get(tag) ?? 0) + 3);
      }
    }
    for (const bookmark of mockPostBookmarks.filter((item) => item.userId === userId)) {
      const post = mockPosts.find((item) => item.id === bookmark.postId);
      if (!post) continue;
      for (const tag of post.tags) {
        interestTags.set(tag, (interestTags.get(tag) ?? 0) + 4);
      }
    }
    const followingIds = new Set(
      mockUserFollows.filter((item) => item.followerId === userId).map((item) => item.followingId)
    );
    const scored = mockPosts
      .filter((post) => post.reviewStatus === "approved")
      .map((post) => {
        const comments = mockComments.filter((comment) => comment.postId === post.id).length;
        const tagScore = post.tags.reduce((sum, tag) => sum + (interestTags.get(tag) ?? 0), 0);
        const followBoost = followingIds.has(post.authorId) ? 6 : 0;
        const freshness = Math.max(
          0,
          72 - (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60)
        );
        return {
          ...post,
          activityScore: tagScore + followBoost + post.likeCount * 2 + comments + freshness / 12,
        };
      })
      .sort((a, b) => b.activityScore - a.activityScore || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return paginateArray(scored, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const [likedPosts, bookmarkedPosts, ownPosts, follows] = await Promise.all([
    prisma.postLike.findMany({
      where: { userId },
      include: { post: { select: { tags: true } } },
      take: 100,
      orderBy: { createdAt: "desc" },
    }),
    prisma.postBookmark.findMany({
      where: { userId },
      include: { post: { select: { tags: true } } },
      take: 100,
      orderBy: { createdAt: "desc" },
    }),
    prisma.post.findMany({
      where: { authorId: userId },
      select: { tags: true },
      take: 50,
      orderBy: { createdAt: "desc" },
    }),
    prisma.userFollow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
  ]);

  const interestTags = new Map<string, number>();
  for (const source of ownPosts) {
    for (const tag of source.tags) interestTags.set(tag, (interestTags.get(tag) ?? 0) + 2);
  }
  for (const source of likedPosts) {
    for (const tag of source.post.tags) interestTags.set(tag, (interestTags.get(tag) ?? 0) + 3);
  }
  for (const source of bookmarkedPosts) {
    for (const tag of source.post.tags) interestTags.set(tag, (interestTags.get(tag) ?? 0) + 4);
  }
  const followingIds = new Set(follows.map((item) => item.followingId));

  const candidates = await prisma.post.findMany({
    where: { reviewStatus: "approved" },
    take: 200,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
      _count: { select: { likes: true, bookmarks: true, comments: true } },
    },
  });

  const scored = candidates
    .map((post) => {
      const tagScore = post.tags.reduce((sum, tag) => sum + (interestTags.get(tag) ?? 0), 0);
      const followBoost = followingIds.has(post.authorId) ? 6 : 0;
      const freshness = Math.max(
        0,
        72 - (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60)
      );
      const score =
        tagScore +
        followBoost +
        post._count.likes * 2 +
        post._count.comments +
        post._count.bookmarks * 2 +
        freshness / 12;
      return {
        score,
        dto: toPostDto({
          ...post,
          authorName: post.author.name,
          likeCount: post._count.likes,
          bookmarkCount: post._count.bookmarks,
        }),
      };
    })
    .sort((a, b) => b.score - a.score || new Date(b.dto.createdAt).getTime() - new Date(a.dto.createdAt).getTime())
    .map((item) => ({ ...item.dto }));

  return paginateArray(scored, params.page, params.limit);
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
  /** v7 P0-11: attach heuristic AI triage for admin lists */
  forAdmin?: boolean;
}): Promise<Paginated<ReportTicket>> {
  if (useMockData) {
    const filtered = mockReportTickets.filter((item) => {
      return !params.status || params.status === "all" || item.status === params.status;
    });
    const pageItems = paginateArray(filtered, params.page, params.limit);
    if (!params.forAdmin) return pageItems;
    const { listStoredAdminAiSuggestionsByTargets } = await import("@/lib/admin-ai");
    const aiMap = await listStoredAdminAiSuggestionsByTargets({
      targetType: "report_ticket",
      targetIds: pageItems.items.map((ticket) => ticket.id),
    });
    const items = pageItems.items.map((ticket) => ({
      ...ticket,
      adminAi: aiMap.get(ticket.id),
    }));
    return { ...pageItems, items };
  }

  const prisma = await getPrisma();
  const where = params.status && params.status !== "all" ? { status: params.status } : {};
  const [rows, total] = await Promise.all([
    prisma.reportTicket.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.reportTicket.count({ where }),
  ]);

  const base = rows.map(toReportTicketDto);
  let items = base;
  if (params.forAdmin) {
    const { listStoredAdminAiSuggestionsByTargets } = await import("@/lib/admin-ai");
    const aiMap = await listStoredAdminAiSuggestionsByTargets({
      targetType: "report_ticket",
      targetIds: base.map((ticket) => ticket.id),
    });
    items = base.map((ticket) => ({
      ...ticket,
      adminAi: aiMap.get(ticket.id),
    }));
  }

  return {
    items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function createReportTicket(params: {
  targetType: "post";
  targetId: string;
  reporterId: string;
  reason: string;
}): Promise<ReportTicket> {
  const reason = params.reason.trim();
  if (reason.length < 8) {
    throw new Error("REPORT_REASON_TOO_SHORT");
  }

  if (useMockData) {
    const existing = mockReportTickets.find(
      (item) =>
        item.targetType === params.targetType &&
        item.targetId === params.targetId &&
        item.reporterId === params.reporterId &&
        item.status === "open"
    );
    if (existing) return existing;

    const row: ReportTicket = {
      id: `report_${Date.now()}`,
      targetType: params.targetType,
      targetId: params.targetId,
      reporterId: params.reporterId,
      reason,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    mockReportTickets.unshift(row);
    mockAuditLogs.unshift({
      id: `audit_report_${Date.now()}`,
      actorId: params.reporterId,
      action: "report_ticket_created",
      entityType: "report_ticket",
      entityId: row.id,
      createdAt: row.createdAt,
      metadata: { targetType: params.targetType, targetId: params.targetId },
    });
    return row;
  }

  const prisma = await getPrisma();
  const existing = await prisma.reportTicket.findFirst({
    where: {
      targetType: params.targetType,
      targetId: params.targetId,
      reporterId: params.reporterId,
      status: "open",
    },
  });
  if (existing) {
    return toReportTicketDto(existing);
  }

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.reportTicket.create({
      data: {
        targetType: params.targetType,
        targetId: params.targetId,
        reporterId: params.reporterId,
        reason,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.reporterId,
        action: "report_ticket_created",
        entityType: "report_ticket",
        entityId: created.id,
        metadata: { targetType: params.targetType, targetId: params.targetId },
      },
    });
    return created;
  });
  return toReportTicketDto(row);
}

export async function resolveReportTicket(params: {
  ticketId: string;
  adminUserId: string;
}): Promise<ReportTicket> {
  if (useMockData) {
    const row = mockReportTickets.find((item) => item.id === params.ticketId);
    if (!row) throw new Error("REPORT_TICKET_NOT_FOUND");
    row.status = "closed";
    row.resolvedAt = new Date().toISOString();
    row.resolvedBy = params.adminUserId;
    mockAuditLogs.unshift({
      id: `audit_report_resolve_${Date.now()}`,
      actorId: params.adminUserId,
      action: "report_ticket_closed",
      entityType: "report_ticket",
      entityId: row.id,
      createdAt: row.resolvedAt,
    });
    return row;
  }

  const prisma = await getPrisma();
  const row = await prisma.$transaction(async (tx) => {
    const current = await tx.reportTicket.findUnique({ where: { id: params.ticketId } });
    if (!current) throw new Error("REPORT_TICKET_NOT_FOUND");
    const updated = await tx.reportTicket.update({
      where: { id: params.ticketId },
      data: {
        status: "closed",
        resolvedAt: new Date(),
        resolvedBy: params.adminUserId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.adminUserId,
        action: "report_ticket_closed",
        entityType: "report_ticket",
        entityId: updated.id,
      },
    });
    return updated;
  });
  return toReportTicketDto(row);
}

export async function listAuditLogs(params: {
  actorId?: string;
  action?: string;
  agentBindingId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
}): Promise<Paginated<AuditLog>> {
  if (useMockData) {
    const filtered = mockAuditLogs.filter((item) => {
      if (params.actorId && item.actorId !== params.actorId) return false;
      if (params.action && item.action !== params.action) return false;
      if (params.agentBindingId && item.agentBindingId !== params.agentBindingId) return false;
      if (params.dateFrom && new Date(item.createdAt) < new Date(params.dateFrom)) return false;
      if (params.dateTo && new Date(item.createdAt) > new Date(params.dateTo)) return false;
      return true;
    });
    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where: Prisma.AuditLogWhereInput = {
    ...(params.actorId ? { actorId: params.actorId } : {}),
    ...(params.action ? { action: params.action } : {}),
    ...(params.agentBindingId ? { agentBindingId: params.agentBindingId } : {}),
    ...((params.dateFrom || params.dateTo)
      ? {
          createdAt: {
            ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
            ...(params.dateTo ? { lte: new Date(params.dateTo) } : {}),
          },
        }
      : {}),
  };
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

export async function updateTeamProfile(params: {
  teamSlug: string;
  actorUserId: string;
  name?: string;
  mission?: string | null;
}): Promise<TeamDetail> {
  return updateTeamProfileFromDomain(params);
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
    const membership = mockTeamMemberships.find((m) => m.teamId === team.id && m.userId === params.actorUserId);
    if (!membership || !canManageTeamMembership(membership.role)) throw new Error("FORBIDDEN_NOT_OWNER");
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
  const team = await prisma.team.findUnique({ where: { slug: params.teamSlug }, select: { id: true } });
  if (!team) throw new Error("TEAM_NOT_FOUND");
  const membership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: params.actorUserId } },
    select: { role: true },
  });
  if (!membership || !canManageTeamMembership(membership.role as TeamRole)) throw new Error("FORBIDDEN_NOT_OWNER");
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
  reviewerUserId?: string;
  ownerUserId?: string;
  action: "approve" | "reject";
}): Promise<TeamJoinRequestRow> {
  const reviewerUserId = params.reviewerUserId ?? params.ownerUserId;
  if (!reviewerUserId) {
    throw new Error("FORBIDDEN_NOT_OWNER");
  }
  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) {
      throw new Error("TEAM_NOT_FOUND");
    }
    const reviewer = mockTeamMemberships.find((m) => m.teamId === team.id && m.userId === reviewerUserId);
    if (!reviewer || !canReviewJoinRequests(reviewer.role)) {
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
      actorId: reviewerUserId,
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
  const reviewerMembership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: reviewerUserId } },
    select: { role: true },
  });
  if (!reviewerMembership || !canReviewJoinRequests(reviewerMembership.role as TeamRole)) {
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
          actorId: reviewerUserId,
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
        actorId: reviewerUserId,
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
  role?: TeamRole;
}): Promise<TeamMember> {
  const email = params.email.trim().toLowerCase();
  if (!email) {
    throw new Error("INVALID_EMAIL");
  }
  const nextRole: TeamRole = params.role && params.role !== "owner" ? params.role : "member";

  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) {
      throw new Error("TEAM_NOT_FOUND");
    }
    const actorMembership = mockTeamMemberships.find((m) => m.teamId === team.id && m.userId === params.actorUserId);
    if (!actorMembership || !canManageTeamMembership(actorMembership.role)) {
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
      role: nextRole,
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
    return { userId: target.id, name: target.name, email: target.email, role: nextRole, joinedAt };
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({
    where: { slug: params.teamSlug },
    select: { id: true, ownerUserId: true, slug: true },
  });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }
  const actorMembership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: params.actorUserId } },
    select: { role: true },
  });
  if (!actorMembership || !canManageTeamMembership(actorMembership.role as TeamRole)) {
    throw new Error("FORBIDDEN_NOT_OWNER");
  }
  const target = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!target) {
    throw new Error("USER_NOT_FOUND");
  }

  try {
    const row = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const m = await tx.teamMembership.create({
        data: { teamId: team.id, userId: target.id, role: nextRole },
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
      role: row.role as TeamRole,
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
    const actorMembership = mockTeamMemberships.find((m) => m.teamId === team.id && m.userId === params.actorUserId);
    const canManage = actorMembership ? canManageTeamMembership(actorMembership.role) : false;
    const isSelf = params.actorUserId === params.memberUserId;
    if (!canManage && !isSelf) {
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

  const actorMembership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: params.actorUserId } },
    select: { role: true },
  });
  const canManage = actorMembership ? canManageTeamMembership(actorMembership.role as TeamRole) : false;
  const isSelf = params.actorUserId === params.memberUserId;
  if (!canManage && !isSelf) {
    throw new Error("FORBIDDEN");
  }

  await prisma.teamMembership.delete({
    where: { teamId_userId: { teamId: team.id, userId: params.memberUserId } },
  });
}

export async function updateTeamMemberRole(params: {
  teamSlug: string;
  actorUserId: string;
  memberUserId: string;
  role: TeamRole;
}): Promise<TeamMember> {
  if (params.role === "owner") {
    throw new Error("INVALID_TEAM_ROLE");
  }

  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) throw new Error("TEAM_NOT_FOUND");
    const actorMembership = mockTeamMemberships.find((m) => m.teamId === team.id && m.userId === params.actorUserId);
    if (!actorMembership || !canManageTeamMembership(actorMembership.role)) throw new Error("FORBIDDEN_NOT_OWNER");
    const membership = mockTeamMemberships.find((m) => m.teamId === team.id && m.userId === params.memberUserId);
    if (!membership) throw new Error("MEMBERSHIP_NOT_FOUND");
    if (membership.role === "owner") throw new Error("CANNOT_EDIT_OWNER");
    membership.role = params.role;
    const user = mockUsers.find((u) => u.id === params.memberUserId);
    const now = new Date().toISOString();
    mockAuditLogs.unshift({
      id: `log_tm_role_${Date.now()}`,
      actorId: params.actorUserId,
      action: "team_member_role_updated",
      entityType: "team",
      entityId: team.id,
      metadata: { teamId: team.id, memberUserId: params.memberUserId, role: params.role },
      createdAt: now,
    });
    return {
      userId: membership.userId,
      name: user?.name ?? "Unknown",
      email: user?.email ?? "",
      role: membership.role,
      joinedAt: membership.joinedAt,
    };
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({ where: { slug: params.teamSlug }, select: { id: true } });
  if (!team) throw new Error("TEAM_NOT_FOUND");
  const actorMembership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: params.actorUserId } },
    select: { role: true },
  });
  if (!actorMembership || !canManageTeamMembership(actorMembership.role as TeamRole)) throw new Error("FORBIDDEN_NOT_OWNER");
  const membership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: params.memberUserId } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!membership) throw new Error("MEMBERSHIP_NOT_FOUND");
  if (membership.role === "owner") throw new Error("CANNOT_EDIT_OWNER");
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.teamMembership.update({
      where: { teamId_userId: { teamId: team.id, userId: params.memberUserId } },
      data: { role: params.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.actorUserId,
        action: "team_member_role_updated",
        entityType: "team",
        entityId: team.id,
        metadata: { teamId: team.id, memberUserId: params.memberUserId, role: params.role },
      },
    });
    return row;
  });
  return {
    userId: updated.user.id,
    name: updated.user.name,
    email: updated.user.email,
    role: updated.role as TeamRole,
    joinedAt: updated.joinedAt.toISOString(),
  };
}

function parseScopesFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((x): x is string => typeof x === "string");
}

function toAgentBindingSummary(row: {
  id: string;
  label: string;
  agentType: string;
  description?: string | null;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}): AgentBindingSummary {
  return {
    id: row.id,
    label: row.label,
    agentType: row.agentType,
    description: row.description ?? undefined,
    active: row.active,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : row.updatedAt.toISOString(),
  };
}

export async function listAgentBindingsForUser(userId: string): Promise<AgentBindingSummary[]> {
  if (useMockData) {
    return mockAgentBindings
      .filter((item) => item.userId === userId)
      .map((item) => toAgentBindingSummary(item))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const prisma = await getPrisma();
  const rows = await prisma.agentBinding.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map((row) => toAgentBindingSummary(row));
}

export async function createAgentBindingForUser(params: {
  userId: string;
  label: string;
  agentType: string;
  description?: string;
  active?: boolean;
}): Promise<AgentBindingSummary> {
  const label = params.label.trim().slice(0, 80);
  const agentType = params.agentType.trim().slice(0, 40);
  const description = params.description?.trim().slice(0, 280) || undefined;
  if (!label) throw new Error("INVALID_AGENT_BINDING_LABEL");
  if (!agentType) throw new Error("INVALID_AGENT_BINDING_TYPE");
  const now = new Date().toISOString();

  if (useMockData) {
    if (!mockUsers.some((u) => u.id === params.userId)) throw new Error("USER_NOT_FOUND");
    const row = {
      id: `ab_${params.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: params.userId,
      label,
      agentType,
      description,
      active: params.active ?? true,
      createdAt: now,
      updatedAt: now,
    };
    mockAgentBindings.unshift(row);
    mockAuditLogs.unshift({
      id: `log_agent_binding_create_${Date.now()}`,
      actorId: params.userId,
      action: "agent_binding_created",
      entityType: "api_key",
      entityId: row.id,
      metadata: { label, agentType },
      createdAt: now,
    });
    return toAgentBindingSummary(row);
  }

  const prisma = await getPrisma();
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.agentBinding.create({
      data: {
        userId: params.userId,
        label,
        agentType,
        description: description ?? null,
        active: params.active ?? true,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.userId,
        agentBindingId: created.id,
        action: "agent_binding_created",
        entityType: "api_key",
        entityId: created.id,
        metadata: { label, agentType },
      },
    });
    return created;
  });
  return toAgentBindingSummary(row);
}

export async function updateAgentBindingForUser(params: {
  userId: string;
  bindingId: string;
  label?: string;
  agentType?: string;
  description?: string | null;
  active?: boolean;
}): Promise<AgentBindingSummary> {
  const nextLabel = params.label?.trim().slice(0, 80);
  const nextType = params.agentType?.trim().slice(0, 40);
  const nextDescription = params.description === undefined ? undefined : params.description?.trim().slice(0, 280) || null;
  if (params.label !== undefined && !nextLabel) throw new Error("INVALID_AGENT_BINDING_LABEL");
  if (params.agentType !== undefined && !nextType) throw new Error("INVALID_AGENT_BINDING_TYPE");

  if (useMockData) {
    const row = mockAgentBindings.find((item) => item.id === params.bindingId && item.userId === params.userId);
    if (!row) throw new Error("AGENT_BINDING_NOT_FOUND");
    if (nextLabel !== undefined) row.label = nextLabel;
    if (nextType !== undefined) row.agentType = nextType;
    if (nextDescription !== undefined) row.description = nextDescription ?? undefined;
    if (params.active !== undefined) row.active = params.active;
    row.updatedAt = new Date().toISOString();
    return toAgentBindingSummary(row);
  }

  const prisma = await getPrisma();
  const existing = await prisma.agentBinding.findFirst({
    where: { id: params.bindingId, userId: params.userId },
    select: { id: true },
  });
  if (!existing) throw new Error("AGENT_BINDING_NOT_FOUND");
  const row = await prisma.agentBinding.update({
    where: { id: existing.id },
    data: {
      ...(nextLabel !== undefined ? { label: nextLabel } : {}),
      ...(nextType !== undefined ? { agentType: nextType } : {}),
      ...(nextDescription !== undefined ? { description: nextDescription } : {}),
      ...(params.active !== undefined ? { active: params.active } : {}),
    },
  });
  return toAgentBindingSummary(row);
}

export async function deleteAgentBindingForUser(params: {
  userId: string;
  bindingId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  if (useMockData) {
    const idx = mockAgentBindings.findIndex((item) => item.id === params.bindingId && item.userId === params.userId);
    if (idx < 0) throw new Error("AGENT_BINDING_NOT_FOUND");
    mockAgentBindings.splice(idx, 1);
    for (const key of mockApiKeys) {
      if ((key as typeof key & { agentBindingId?: string }).agentBindingId === params.bindingId) {
        delete (key as typeof key & { agentBindingId?: string }).agentBindingId;
      }
    }
    mockAuditLogs.unshift({
      id: `log_agent_binding_delete_${Date.now()}`,
      actorId: params.userId,
      action: "agent_binding_deleted",
      entityType: "api_key",
      entityId: params.bindingId,
      metadata: { bindingId: params.bindingId },
      createdAt: now,
    });
    return;
  }

  const prisma = await getPrisma();
  const existing = await prisma.agentBinding.findFirst({
    where: { id: params.bindingId, userId: params.userId },
    select: { id: true },
  });
  if (!existing) throw new Error("AGENT_BINDING_NOT_FOUND");
  await prisma.$transaction(async (tx) => {
    await tx.apiKey.updateMany({
      where: { agentBindingId: existing.id },
      data: { agentBindingId: null },
    });
    await tx.agentBinding.delete({ where: { id: existing.id } });
    await tx.auditLog.create({
      data: {
        actorId: params.userId,
        action: "agent_binding_deleted",
        entityType: "api_key",
        entityId: existing.id,
        metadata: { bindingId: existing.id },
      },
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────
 * v8 W3 — TeamAgentMembership
 *
 * All functions below enforce a single invariant:
 *
 *   An agent can only be a team member if its binding owner is a human
 *   member of that team. If the owner leaves the team the memberships for
 *   all of their bindings in that team are deactivated (not hard-deleted,
 *   so audit history remains intact).
 *
 * Role upgrades to `coordinator` are separately gated: only team
 *  `owner` / `admin` may grant that role. This is a policy decision, not
 * a schema constraint, so we enforce it in the repository.
 * ──────────────────────────────────────────────────────────────────────── */

function isTeamAgentRole(value: unknown): value is TeamAgentRole {
  return (
    value === "reader" ||
    value === "commenter" ||
    value === "executor" ||
    value === "reviewer" ||
    value === "coordinator"
  );
}

/** Roles that require owner/admin approval to grant (never available to regular members). */
const COORDINATOR_GATED_ROLES: ReadonlySet<TeamAgentRole> = new Set(["coordinator"]);

function canManageTeamAgents(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

/** Can a given role card write to team tasks (beyond the Confirmation queue)? */
export function teamAgentCanWriteTasks(role: TeamAgentRole): boolean {
  return role === "executor" || role === "coordinator";
}

/** Can a given role card create and reassign tasks? */
export function teamAgentCanCoordinate(role: TeamAgentRole): boolean {
  return role === "coordinator";
}

/** Can a given role card leave comments on tasks / discussions? */
export function teamAgentCanComment(role: TeamAgentRole): boolean {
  return role !== "reader";
}

function toTeamAgentMembershipSummary(row: {
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
  createdAt: Date | string;
  updatedAt: Date | string;
  lastActionAt?: Date | string | null;
}): TeamAgentMembershipSummary {
  const iso = (v: Date | string) =>
    typeof v === "string" ? v : v.toISOString();
  return {
    id: row.id,
    teamId: row.teamId,
    teamSlug: row.teamSlug,
    teamName: row.teamName,
    agentBindingId: row.agentBindingId,
    agentLabel: row.agentLabel,
    agentType: row.agentType,
    ownerUserId: row.ownerUserId,
    ownerName: row.ownerName,
    role: row.role,
    grantedByUserId: row.grantedByUserId,
    grantedByName: row.grantedByName,
    active: row.active,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    lastActionAt:
      row.lastActionAt === undefined || row.lastActionAt === null
        ? null
        : iso(row.lastActionAt),
  };
}

/** List agent memberships for a team. Caller must already be a team member. */
export async function listTeamAgentMemberships(params: {
  teamSlug: string;
  viewerUserId: string;
}): Promise<TeamAgentMembershipSummary[]> {
  const { teamId } = await assertTeamMemberRoleBySlug(
    params.teamSlug,
    params.viewerUserId
  );

  if (useMockData) {
    return mockTeamAgentMemberships
      .filter((m) => m.teamId === teamId)
      .map((m) => {
        const binding = mockAgentBindings.find((b) => b.id === m.agentBindingId);
        const owner = mockUsers.find((u) => u.id === m.ownerUserId);
        const grantor = mockUsers.find((u) => u.id === m.grantedByUserId);
        const team = mockTeams.find((t) => t.id === m.teamId);
        const lastAudit = mockAgentActionAudits
          .filter((a) => a.teamId === teamId && a.agentBindingId === m.agentBindingId)
          .map((a) => a.createdAt)
          .sort()
          .reverse()[0];
        return toTeamAgentMembershipSummary({
          ...m,
          teamSlug: team?.slug,
          teamName: team?.name,
          agentLabel: binding?.label,
          agentType: binding?.agentType,
          ownerName: owner?.name,
          grantedByName: grantor?.name,
          lastActionAt: lastAudit ?? null,
        });
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const prisma = await getPrisma();
  const rows = await prisma.teamAgentMembership.findMany({
    where: { teamId },
    include: {
      team: { select: { slug: true, name: true } },
      agentBinding: { select: { label: true, agentType: true } },
      ownerUser: { select: { name: true } },
      grantedBy: { select: { name: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });
  // Compute last action per (team, agentBinding) in a single aggregate query.
  const lastByBinding = new Map<string, Date>();
  if (rows.length > 0) {
    const agg = await prisma.agentActionAudit.groupBy({
      by: ["agentBindingId"],
      where: {
        teamId,
        agentBindingId: { in: rows.map((r) => r.agentBindingId) },
      },
      _max: { createdAt: true },
    });
    for (const a of agg) {
      if (a._max.createdAt) lastByBinding.set(a.agentBindingId, a._max.createdAt);
    }
  }

  return rows.map((row) =>
    toTeamAgentMembershipSummary({
      id: row.id,
      teamId: row.teamId,
      teamSlug: row.team.slug,
      teamName: row.team.name,
      agentBindingId: row.agentBindingId,
      agentLabel: row.agentBinding.label,
      agentType: row.agentBinding.agentType,
      ownerUserId: row.ownerUserId,
      ownerName: row.ownerUser.name,
      role: row.role as TeamAgentRole,
      grantedByUserId: row.grantedByUserId,
      grantedByName: row.grantedBy.name,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastActionAt: lastByBinding.get(row.agentBindingId) ?? null,
    })
  );
}

/**
 * Add an agent into a team.
 *
 * Checks:
 *   - caller is team owner or admin
 *   - binding belongs to a user who is already a team member
 *   - binding is active
 *   - role is a known TeamAgentRole
 *   - coordinator role is only grantable by owner/admin (soft policy gate
 *     also applies to upgrades)
 *
 * Idempotent in effect: if the (team, binding) pair already exists this
 * throws `TEAM_AGENT_ALREADY_MEMBER`. Callers should use `updateTeamAgent`
 * to change role / active.
 */
export async function addTeamAgentMembership(params: {
  teamSlug: string;
  actorUserId: string;
  agentBindingId: string;
  role?: TeamAgentRole;
}): Promise<TeamAgentMembershipSummary> {
  const role: TeamAgentRole = params.role ?? "reader";
  if (!isTeamAgentRole(role)) throw new Error("INVALID_TEAM_AGENT_ROLE");

  const { teamId, role: actorRole } = await assertTeamMemberRoleBySlug(
    params.teamSlug,
    params.actorUserId
  );
  if (!canManageTeamAgents(actorRole)) {
    throw new Error("FORBIDDEN_TEAM_AGENT_MANAGE");
  }
  if (COORDINATOR_GATED_ROLES.has(role) && !canManageTeamAgents(actorRole)) {
    throw new Error("FORBIDDEN_TEAM_AGENT_COORDINATOR");
  }

  const now = new Date().toISOString();

  if (useMockData) {
    const binding = mockAgentBindings.find((b) => b.id === params.agentBindingId);
    if (!binding) throw new Error("AGENT_BINDING_NOT_FOUND");
    if (!binding.active) throw new Error("AGENT_BINDING_INACTIVE");
    const isOwnerMember = mockTeamMemberships.some(
      (m) => m.teamId === teamId && m.userId === binding.userId
    );
    if (!isOwnerMember) throw new Error("AGENT_OWNER_NOT_TEAM_MEMBER");
    const existing = mockTeamAgentMemberships.find(
      (m) => m.teamId === teamId && m.agentBindingId === binding.id
    );
    if (existing) throw new Error("TEAM_AGENT_ALREADY_MEMBER");

    const row = {
      id: `tam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId,
      agentBindingId: binding.id,
      ownerUserId: binding.userId,
      role,
      grantedByUserId: params.actorUserId,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    mockTeamAgentMemberships.unshift(row);
    mockAuditLogs.unshift({
      id: `log_team_agent_add_${Date.now()}`,
      actorId: params.actorUserId,
      action: "team_agent_added",
      entityType: "team_membership",
      entityId: row.id,
      metadata: { teamId, agentBindingId: binding.id, role },
      createdAt: now,
    });
    const team = mockTeams.find((t) => t.id === teamId);
    const owner = mockUsers.find((u) => u.id === binding.userId);
    const grantor = mockUsers.find((u) => u.id === params.actorUserId);
    return toTeamAgentMembershipSummary({
      ...row,
      teamSlug: team?.slug,
      teamName: team?.name,
      agentLabel: binding.label,
      agentType: binding.agentType,
      ownerName: owner?.name,
      grantedByName: grantor?.name,
      lastActionAt: null,
    });
  }

  const prisma = await getPrisma();
  const binding = await prisma.agentBinding.findUnique({
    where: { id: params.agentBindingId },
    select: {
      id: true,
      userId: true,
      active: true,
      label: true,
      agentType: true,
    },
  });
  if (!binding) throw new Error("AGENT_BINDING_NOT_FOUND");
  if (!binding.active) throw new Error("AGENT_BINDING_INACTIVE");
  const membership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId, userId: binding.userId } },
    select: { id: true },
  });
  if (!membership) throw new Error("AGENT_OWNER_NOT_TEAM_MEMBER");

  const existing = await prisma.teamAgentMembership.findUnique({
    where: { teamId_agentBindingId: { teamId, agentBindingId: binding.id } },
    select: { id: true },
  });
  if (existing) throw new Error("TEAM_AGENT_ALREADY_MEMBER");

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.teamAgentMembership.create({
      data: {
        teamId,
        agentBindingId: binding.id,
        ownerUserId: binding.userId,
        role,
        grantedByUserId: params.actorUserId,
        active: true,
      },
      include: {
        team: { select: { slug: true, name: true } },
        agentBinding: { select: { label: true, agentType: true } },
        ownerUser: { select: { name: true } },
        grantedBy: { select: { name: true } },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.actorUserId,
        action: "team_agent_added",
        entityType: "team_membership",
        entityId: row.id,
        metadata: { teamId, agentBindingId: binding.id, role },
      },
    });
    return row;
  });

  return toTeamAgentMembershipSummary({
    id: created.id,
    teamId: created.teamId,
    teamSlug: created.team.slug,
    teamName: created.team.name,
    agentBindingId: created.agentBindingId,
    agentLabel: created.agentBinding.label,
    agentType: created.agentBinding.agentType,
    ownerUserId: created.ownerUserId,
    ownerName: created.ownerUser.name,
    role: created.role as TeamAgentRole,
    grantedByUserId: created.grantedByUserId,
    grantedByName: created.grantedBy.name,
    active: created.active,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
    lastActionAt: null,
  });
}

/** Update role card and/or active flag for an existing team-agent membership. */
export async function updateTeamAgentMembership(params: {
  teamSlug: string;
  actorUserId: string;
  membershipId: string;
  role?: TeamAgentRole;
  active?: boolean;
}): Promise<TeamAgentMembershipSummary> {
  if (params.role !== undefined && !isTeamAgentRole(params.role)) {
    throw new Error("INVALID_TEAM_AGENT_ROLE");
  }
  const { teamId, role: actorRole } = await assertTeamMemberRoleBySlug(
    params.teamSlug,
    params.actorUserId
  );
  if (!canManageTeamAgents(actorRole)) {
    throw new Error("FORBIDDEN_TEAM_AGENT_MANAGE");
  }
  if (
    params.role !== undefined &&
    COORDINATOR_GATED_ROLES.has(params.role) &&
    !canManageTeamAgents(actorRole)
  ) {
    throw new Error("FORBIDDEN_TEAM_AGENT_COORDINATOR");
  }
  const now = new Date().toISOString();

  if (useMockData) {
    const existing = mockTeamAgentMemberships.find(
      (m) => m.id === params.membershipId && m.teamId === teamId
    );
    if (!existing) throw new Error("TEAM_AGENT_NOT_FOUND");
    if (params.role !== undefined) existing.role = params.role;
    if (params.active !== undefined) existing.active = params.active;
    existing.updatedAt = now;
    mockAuditLogs.unshift({
      id: `log_team_agent_update_${Date.now()}`,
      actorId: params.actorUserId,
      action: "team_agent_updated",
      entityType: "team_membership",
      entityId: existing.id,
      metadata: {
        teamId,
        agentBindingId: existing.agentBindingId,
        role: existing.role,
        active: existing.active,
      },
      createdAt: now,
    });
    const binding = mockAgentBindings.find((b) => b.id === existing.agentBindingId);
    const owner = mockUsers.find((u) => u.id === existing.ownerUserId);
    const grantor = mockUsers.find((u) => u.id === existing.grantedByUserId);
    const team = mockTeams.find((t) => t.id === existing.teamId);
    return toTeamAgentMembershipSummary({
      ...existing,
      teamSlug: team?.slug,
      teamName: team?.name,
      agentLabel: binding?.label,
      agentType: binding?.agentType,
      ownerName: owner?.name,
      grantedByName: grantor?.name,
      lastActionAt: null,
    });
  }

  const prisma = await getPrisma();
  const existing = await prisma.teamAgentMembership.findFirst({
    where: { id: params.membershipId, teamId },
    select: { id: true },
  });
  if (!existing) throw new Error("TEAM_AGENT_NOT_FOUND");
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.teamAgentMembership.update({
      where: { id: existing.id },
      data: {
        ...(params.role !== undefined ? { role: params.role } : {}),
        ...(params.active !== undefined ? { active: params.active } : {}),
      },
      include: {
        team: { select: { slug: true, name: true } },
        agentBinding: { select: { label: true, agentType: true } },
        ownerUser: { select: { name: true } },
        grantedBy: { select: { name: true } },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.actorUserId,
        action: "team_agent_updated",
        entityType: "team_membership",
        entityId: row.id,
        metadata: {
          teamId,
          agentBindingId: row.agentBindingId,
          role: row.role,
          active: row.active,
        },
      },
    });
    return row;
  });

  return toTeamAgentMembershipSummary({
    id: updated.id,
    teamId: updated.teamId,
    teamSlug: updated.team.slug,
    teamName: updated.team.name,
    agentBindingId: updated.agentBindingId,
    agentLabel: updated.agentBinding.label,
    agentType: updated.agentBinding.agentType,
    ownerUserId: updated.ownerUserId,
    ownerName: updated.ownerUser.name,
    role: updated.role as TeamAgentRole,
    grantedByUserId: updated.grantedByUserId,
    grantedByName: updated.grantedBy.name,
    active: updated.active,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    lastActionAt: null,
  });
}

/** Remove an agent membership from a team. */
export async function removeTeamAgentMembership(params: {
  teamSlug: string;
  actorUserId: string;
  membershipId: string;
}): Promise<void> {
  const { teamId, role: actorRole } = await assertTeamMemberRoleBySlug(
    params.teamSlug,
    params.actorUserId
  );
  if (!canManageTeamAgents(actorRole)) {
    throw new Error("FORBIDDEN_TEAM_AGENT_MANAGE");
  }
  const now = new Date().toISOString();

  if (useMockData) {
    const idx = mockTeamAgentMemberships.findIndex(
      (m) => m.id === params.membershipId && m.teamId === teamId
    );
    if (idx < 0) throw new Error("TEAM_AGENT_NOT_FOUND");
    const [row] = mockTeamAgentMemberships.splice(idx, 1);
    mockAuditLogs.unshift({
      id: `log_team_agent_remove_${Date.now()}`,
      actorId: params.actorUserId,
      action: "team_agent_removed",
      entityType: "team_membership",
      entityId: row.id,
      metadata: { teamId, agentBindingId: row.agentBindingId },
      createdAt: now,
    });
    return;
  }

  const prisma = await getPrisma();
  const existing = await prisma.teamAgentMembership.findFirst({
    where: { id: params.membershipId, teamId },
    select: { id: true, agentBindingId: true },
  });
  if (!existing) throw new Error("TEAM_AGENT_NOT_FOUND");
  await prisma.$transaction(async (tx) => {
    await tx.teamAgentMembership.delete({ where: { id: existing.id } });
    await tx.auditLog.create({
      data: {
        actorId: params.actorUserId,
        action: "team_agent_removed",
        entityType: "team_membership",
        entityId: existing.id,
        metadata: { teamId, agentBindingId: existing.agentBindingId },
      },
    });
  });
}

/**
 * Resolve the effective team-agent role for `(teamId, agentBindingId)`.
 * Returns `null` if the agent is not a member of the team (or the
 * membership is inactive). Used by MCP write handlers to gate task /
 * discussion / membership operations.
 */
export async function resolveTeamAgentRole(params: {
  teamId: string;
  agentBindingId: string;
}): Promise<TeamAgentRole | null> {
  if (useMockData) {
    const row = mockTeamAgentMemberships.find(
      (m) =>
        m.teamId === params.teamId &&
        m.agentBindingId === params.agentBindingId &&
        m.active
    );
    return row ? row.role : null;
  }
  const prisma = await getPrisma();
  const row = await prisma.teamAgentMembership.findUnique({
    where: {
      teamId_agentBindingId: {
        teamId: params.teamId,
        agentBindingId: params.agentBindingId,
      },
    },
    select: { role: true, active: true },
  });
  if (!row || !row.active) return null;
  return row.role as TeamAgentRole;
}

/**
 * List the teams an agent binding is a member of. Used by
 * `/settings/agents` so users can see which teams have granted their
 * agent role cards.
 */
export async function listTeamAgentMembershipsForBinding(params: {
  userId: string;
  agentBindingId: string;
}): Promise<TeamAgentMembershipSummary[]> {
  // Authorization: the binding must belong to the user.
  if (useMockData) {
    const binding = mockAgentBindings.find(
      (b) => b.id === params.agentBindingId && b.userId === params.userId
    );
    if (!binding) throw new Error("AGENT_BINDING_NOT_FOUND");
    return mockTeamAgentMemberships
      .filter((m) => m.agentBindingId === params.agentBindingId)
      .map((m) => {
        const team = mockTeams.find((t) => t.id === m.teamId);
        const owner = mockUsers.find((u) => u.id === m.ownerUserId);
        const grantor = mockUsers.find((u) => u.id === m.grantedByUserId);
        return toTeamAgentMembershipSummary({
          ...m,
          teamSlug: team?.slug,
          teamName: team?.name,
          agentLabel: binding.label,
          agentType: binding.agentType,
          ownerName: owner?.name,
          grantedByName: grantor?.name,
          lastActionAt: null,
        });
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const prisma = await getPrisma();
  const binding = await prisma.agentBinding.findFirst({
    where: { id: params.agentBindingId, userId: params.userId },
    select: { id: true, label: true, agentType: true },
  });
  if (!binding) throw new Error("AGENT_BINDING_NOT_FOUND");
  const rows = await prisma.teamAgentMembership.findMany({
    where: { agentBindingId: binding.id },
    include: {
      team: { select: { slug: true, name: true } },
      ownerUser: { select: { name: true } },
      grantedBy: { select: { name: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });
  return rows.map((row) =>
    toTeamAgentMembershipSummary({
      id: row.id,
      teamId: row.teamId,
      teamSlug: row.team.slug,
      teamName: row.team.name,
      agentBindingId: row.agentBindingId,
      agentLabel: binding.label,
      agentType: binding.agentType,
      ownerUserId: row.ownerUserId,
      ownerName: row.ownerUser.name,
      role: row.role as TeamAgentRole,
      grantedByUserId: row.grantedByUserId,
      grantedByName: row.grantedBy.name,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastActionAt: null,
    })
  );
}

function toApiKeySummary(row: {
  id: string;
  label: string;
  prefix: string;
  scopes?: unknown;
  agentBindingId?: string | null;
  agentBinding?: {
    id: string;
    label: string;
    agentType: string;
    description?: string | null;
    active: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
  } | null;
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
    agentBindingId: row.agentBindingId ?? undefined,
    agentBinding: row.agentBinding ? toAgentBindingSummary(row.agentBinding) : undefined,
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
      .map((k) =>
        toApiKeySummary({
          ...k,
          agentBinding: k.agentBindingId
            ? mockAgentBindings.find((binding) => binding.id === k.agentBindingId && binding.userId === userId)
            : undefined,
        })
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const prisma = await getPrisma();
  const rows = await prisma.apiKey.findMany({
    where: { userId },
    include: { agentBinding: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => toApiKeySummary(r));
}

export async function createApiKeyForUser(params: {
  userId: string;
  label: string;
  scopes?: string[];
  agentBindingId?: string;
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
    if (
      params.agentBindingId &&
      !mockAgentBindings.some((binding) => binding.id === params.agentBindingId && binding.userId === params.userId)
    ) {
      throw new Error("AGENT_BINDING_NOT_FOUND");
    }
    if (mockApiKeys.some((k) => k.keyHash === keyHash)) {
      throw new Error("API_KEY_HASH_COLLISION");
    }
    const id = `apk_${params.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    mockApiKeys.unshift({
      id,
      userId: params.userId,
      ...(params.agentBindingId ? { agentBindingId: params.agentBindingId } : {}),
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
    const createdMock = mockApiKeys.find((k) => k.id === id)!;
    return {
      ...toApiKeySummary({
        ...createdMock,
        agentBinding: createdMock.agentBindingId
          ? mockAgentBindings.find((binding) => binding.id === createdMock.agentBindingId && binding.userId === params.userId)
          : undefined,
      }),
      secret: fullToken,
    };
  }

  const prisma = await getPrisma();
  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (params.agentBindingId) {
      const binding = await tx.agentBinding.findFirst({
        where: { id: params.agentBindingId, userId: params.userId },
        select: { id: true },
      });
      if (!binding) {
        throw new Error("AGENT_BINDING_NOT_FOUND");
      }
    }
    const row = await tx.apiKey.create({
      data: {
        userId: params.userId,
        agentBindingId: params.agentBindingId ?? null,
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
      include: { agentBinding: true },
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
  const storedSecret = encryptStoredSecret(secret, "webhook-endpoint-secret");
  const now = new Date().toISOString();
  if (useMockData) {
    if (!mockUsers.some((u) => u.id === params.userId)) throw new Error("USER_NOT_FOUND");
    const id = `wh_${params.userId}_${Date.now()}_${randomBytes(4).toString("hex")}`;
    mockWebhookEndpoints.unshift({
      id,
      userId: params.userId,
      url,
      secret: storedSecret,
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
    data: { userId: params.userId, url, secret: storedSecret, events, active: true },
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
    return w?.secret ? decryptStoredSecret(w.secret, "webhook-endpoint-secret") : null;
  }
  const prisma = await getPrisma();
  const row = await prisma.webhookEndpoint.findFirst({
    where: { id: params.webhookId, userId: params.userId },
    select: { secret: true },
  });
  return row?.secret ? decryptStoredSecret(row.secret, "webhook-endpoint-secret") : null;
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
    if (
      row.agentBindingId &&
      !mockAgentBindings.some((binding) => binding.id === row.agentBindingId && binding.userId === row.userId && binding.active)
    ) {
      return null;
    }
    const scopeList = row.scopes?.length ? row.scopes : [...DEFAULT_API_KEY_SCOPES];
    return {
      userId: u.id,
      role: u.role,
      name: u.name,
      apiKeyScopes: scopeList,
      apiKeyId: row.id,
      agentBindingId: row.agentBindingId,
      enterpriseStatus: u.enterpriseStatus ?? "none",
      enterpriseOrganization: u.enterpriseOrganization ?? undefined,
      enterpriseWebsite: u.enterpriseWebsite ?? undefined,
    };
  }

  const prisma = await getPrisma();
  const row = await prisma.apiKey.findFirst({
    where: { keyHash, revokedAt: null },
    select: { id: true, userId: true, scopes: true, expiresAt: true, agentBindingId: true },
  });
  if (!row) {
    return null;
  }
  if (row.expiresAt && row.expiresAt < new Date()) {
    return null;
  }
  if (row.agentBindingId) {
    const binding = await prisma.agentBinding.findFirst({
      where: { id: row.agentBindingId, userId: row.userId, active: true },
      select: { id: true },
    });
    if (!binding) {
      return null;
    }
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
    agentBindingId: row.agentBindingId ?? undefined,
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
      user.emailVerifiedAt = user.emailVerifiedAt ?? new Date().toISOString();
      return user;
    }
    user = mockUsers.find((u) => u.email.toLowerCase() === normalizeEmail(input.email));
    if (!user) {
      throw new Error("EMAIL_SIGNUP_REQUIRED");
    }
    user.name = input.name;
    user.avatarUrl = input.avatarUrl;
    user.githubId = input.githubId;
    user.githubUsername = input.githubUsername;
    user.emailVerifiedAt = user.emailVerifiedAt ?? new Date().toISOString();
    return user;
  }

  const prisma = await getPrisma();
  const existingByGh = await prisma.user.findUnique({ where: { githubId: input.githubId } });
  const existing =
    existingByGh ??
    (await prisma.user.findUnique({
      where: { email: input.email },
    }));
  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        avatarUrl: input.avatarUrl,
        githubUsername: input.githubUsername,
        githubId: existing.githubId ?? input.githubId,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
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

  throw new Error("EMAIL_SIGNUP_REQUIRED");
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

const EMAIL_SIGNUP_CODE_TTL_MS = 15 * 60 * 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerUserWithEmailPassword(params: {
  email: string;
  password: string;
  name: string;
  acceptTerms: boolean;
}): Promise<{ userId: string; verificationToken: string }> {
  if (!params.acceptTerms) {
    throw new Error("TERMS_NOT_ACCEPTED");
  }
  if (useMockData) {
    const email = normalizeEmail(params.email);
    if (mockUsers.some((u) => u.email.toLowerCase() === email)) {
      throw new Error("EMAIL_IN_USE");
    }
    const token = generateSecureToken();
    const id = `u-email-${mockUsers.length + 1}`;
    mockUsers.push({
      id,
      email,
      name: params.name.trim(),
      role: "user",
      sessionVersion: 0,
      passwordHash: await hashPassword(params.password),
      emailVerifiedAt: undefined,
      emailVerificationToken: token,
    });
    return { userId: id, verificationToken: token };
  }

  const prisma = await getPrisma();
  const email = normalizeEmail(params.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("EMAIL_IN_USE");
  }
  const passwordHash = await hashPassword(params.password);
  const verificationToken = generateSecureToken();
  const created = await prisma.user.create({
    data: {
      email,
      name: params.name.trim(),
      role: "user",
      passwordHash,
      emailVerificationToken: verificationToken,
      termsAcceptedAt: new Date(),
      enterpriseProfile: { create: { status: "none" } },
    },
    select: { id: true },
  });
  return { userId: created.id, verificationToken };
}

export async function verifyEmailSignupToken(token: string): Promise<{ ok: true; email: string } | { ok: false }> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false };

  if (useMockData) {
    const u = mockUsers.find((x) => x.emailVerificationToken === trimmed);
    if (!u) return { ok: false };
    u.emailVerifiedAt = new Date().toISOString();
    u.emailVerificationToken = undefined;
    return { ok: true, email: u.email };
  }

  const prisma = await getPrisma();
  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: trimmed },
    select: { id: true, email: true },
  });
  if (!user) return { ok: false };
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
    },
  });
  return { ok: true, email: user.email };
}

export async function authenticateEmailPassword(
  email: string,
  password: string
): Promise<User | null> {
  const normalized = normalizeEmail(email);
  if (useMockData) {
    const u = mockUsers.find((x) => x.email.toLowerCase() === normalized);
    if (!u || !u.passwordHash) return null;
    if (!u.emailVerifiedAt) return null;
    const ok = await verifyPassword(password, u.passwordHash);
    if (!ok) return null;
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      sessionVersion: u.sessionVersion ?? 0,
      githubId: u.githubId,
      githubUsername: u.githubUsername,
      avatarUrl: u.avatarUrl,
      enterpriseStatus: u.enterpriseStatus ?? "none",
      enterpriseOrganization: u.enterpriseOrganization,
      enterpriseWebsite: u.enterpriseWebsite,
    };
  }

  const prisma = await getPrisma();
  const row = await prisma.user.findUnique({
    where: { email: normalized },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      sessionVersion: true,
      passwordHash: true,
      emailVerifiedAt: true,
      githubId: true,
      githubUsername: true,
      avatarUrl: true,
      enterpriseProfile: { select: enterpriseProfileSelect },
    },
  });
  if (!row?.passwordHash || !row.emailVerifiedAt) return null;
  const valid = await verifyPassword(password, row.passwordHash);
  if (!valid) return null;
  const ent = sessionEnterpriseFromProfile(row.enterpriseProfile ?? undefined);
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as Role,
    sessionVersion: row.sessionVersion,
    githubId: row.githubId ?? undefined,
    githubUsername: row.githubUsername ?? undefined,
    avatarUrl: row.avatarUrl ?? undefined,
    enterpriseStatus: ent.enterpriseStatus,
    enterpriseOrganization: ent.enterpriseOrganization,
    enterpriseWebsite: ent.enterpriseWebsite,
  };
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  const token = generateSecureToken();
  const expires = new Date(Date.now() + EMAIL_SIGNUP_CODE_TTL_MS * 4);

  if (useMockData) {
    const u = mockUsers.find((x) => x.email.toLowerCase() === normalized);
    if (!u || !u.emailVerifiedAt) return null;
    u.passwordResetToken = token;
    u.passwordResetExpires = expires.toISOString();
    return token;
  }

  const prisma = await getPrisma();
  const row = await prisma.user.updateMany({
    where: { email: normalized, emailVerifiedAt: { not: null } },
    data: {
      passwordResetToken: token,
      passwordResetExpires: expires,
    },
  });
  if (row.count === 0) return null;
  return token;
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  const trimmed = token.trim();
  if (!trimmed) return false;
  const hash = await hashPassword(newPassword);

  if (useMockData) {
    const u = mockUsers.find((x) => x.passwordResetToken === trimmed);
    if (!u || !u.passwordResetExpires) return false;
    if (new Date(u.passwordResetExpires).getTime() < Date.now()) return false;
    u.passwordHash = hash;
    u.passwordResetToken = undefined;
    u.passwordResetExpires = undefined;
    u.sessionVersion = (u.sessionVersion ?? 0) + 1;
    return true;
  }

  const prisma = await getPrisma();
  const user = await prisma.user.findUnique({
    where: { passwordResetToken: trimmed },
    select: { id: true, passwordResetExpires: true },
  });
  if (!user?.passwordResetExpires || user.passwordResetExpires.getTime() < Date.now()) {
    return false;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hash,
      passwordResetToken: null,
      passwordResetExpires: null,
      sessionVersion: { increment: 1 },
    },
  });
  return true;
}

export async function deleteUserAccount(userId: string): Promise<void> {
  if (useMockData) {
    const idx = mockUsers.findIndex((u) => u.id === userId);
    if (idx >= 0) mockUsers.splice(idx, 1);
    return;
  }
  const prisma = await getPrisma();
  await prisma.user.delete({ where: { id: userId } });
}

export async function unlinkGitHubAccount(userId: string): Promise<void> {
  if (useMockData) {
    const u = mockUsers.find((x) => x.id === userId);
    if (u) {
      u.githubId = undefined;
      u.githubUsername = undefined;
      u.sessionVersion = (u.sessionVersion ?? 0) + 1;
    }
    return;
  }
  const prisma = await getPrisma();
  await prisma.user.update({
    where: { id: userId },
    data: {
      githubId: null,
      githubUsername: null,
      sessionVersion: { increment: 1 },
    },
  });
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
  repoUrl?: string | null;
  websiteUrl?: string | null;
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

function classifyTeamActivityEntry(input: { entityType: string; action: string }): TeamActivityLogEntry["kind"] {
  if (input.entityType === "agent_action_audit") return "agent";
  if (input.entityType === "team_discussion") return "discussion";
  return "task";
}

function summarizeTeamActivityEntry(input: {
  kind: TeamActivityLogEntry["kind"];
  action: string;
  metadata?: Record<string, unknown>;
}): string {
  if (input.kind === "agent") {
    return input.action.replaceAll("_", " ");
  }
  const title =
    typeof input.metadata?.title === "string"
      ? input.metadata.title
      : typeof input.metadata?.taskTitle === "string"
        ? input.metadata.taskTitle
        : typeof input.metadata?.discussionTitle === "string"
          ? input.metadata.discussionTitle
          : null;
  return title ? `${input.action.replaceAll("_", " ")} · ${title}` : input.action.replaceAll("_", " ");
}

// ─── P3: 协作日志 (Team Activity Log) ──────────────────

export async function listTeamActivityLog(params: {
  teamSlug: string;
  page: number;
  limit: number;
  type?: TeamActivityLogEntry["kind"] | "all";
}): Promise<Paginated<TeamActivityLogEntry>> {
  const type = params.type ?? "all";
  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) return { items: [], pagination: { page: params.page, limit: params.limit, total: 0, totalPages: 1 } };

    const teamEntityTypes = ["team", "team_task", "team_milestone", "team_join_request", "team_discussion", "team_task_comment"];
    const auditEntries = mockAuditLogs
      .filter((log) => {
        if (!teamEntityTypes.includes(log.entityType)) return false;
        const meta = log.metadata as Record<string, unknown> | undefined;
        return meta?.teamId === team.id;
      })
      .map((log) => {
        const user = mockUsers.find((u) => u.id === log.actorId);
        return {
          id: log.id,
          kind: classifyTeamActivityEntry({ entityType: log.entityType, action: log.action }),
          actorId: log.actorId,
          actorName: user?.name,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          metadata: log.metadata,
          summary: summarizeTeamActivityEntry({
            kind: classifyTeamActivityEntry({ entityType: log.entityType, action: log.action }),
            action: log.action,
            metadata: log.metadata as Record<string, unknown> | undefined,
          }),
          createdAt: log.createdAt,
        } as TeamActivityLogEntry;
      });
    const agentEntries = mockAgentActionAudits
      .filter((item) => item.teamId === team.id)
      .map((item) => ({
        id: item.id,
        kind: "agent" as const,
        actorId: item.actorUserId,
        actorName: mockUsers.find((user) => user.id === item.actorUserId)?.name,
        action: item.action,
        entityType: "agent_action_audit",
        entityId: item.taskId ?? item.id,
        metadata: item.metadata,
        summary: summarizeTeamActivityEntry({ kind: "agent", action: item.action, metadata: item.metadata }),
        createdAt: item.createdAt,
      }));
    const merged = [...auditEntries, ...agentEntries]
      .filter((item) => (type === "all" ? true : item.kind === type))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return paginateArray(merged, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({ where: { slug: params.teamSlug }, select: { id: true } });
  if (!team) return { items: [], pagination: { page: params.page, limit: params.limit, total: 0, totalPages: 1 } };

  const teamId = team.id;
  const teamEntityTypes = ["team", "team_task", "team_milestone", "team_join_request", "team_discussion", "team_task_comment"];

  const where = {
    entityType: { in: teamEntityTypes },
    metadata: { path: ["teamId"], equals: teamId },
  };

  const [items, agentRows] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { name: true } } },
    }),
    prisma.agentActionAudit.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const merged = [
    ...items.map((log) => {
      const kind = classifyTeamActivityEntry({ entityType: log.entityType, action: log.action });
      const metadata = log.metadata as Record<string, unknown> | undefined;
      return {
        id: log.id,
        kind,
        actorId: log.actorId,
        actorName: log.actor.name,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata,
        summary: summarizeTeamActivityEntry({ kind, action: log.action, metadata }),
        createdAt: log.createdAt.toISOString(),
      } satisfies TeamActivityLogEntry;
    }),
    ...agentRows.map((row) => ({
      id: row.id,
      kind: "agent" as const,
      actorId: row.actorUserId,
      actorName: undefined,
      action: row.action,
      entityType: "agent_action_audit",
      entityId: row.taskId ?? row.id,
      metadata: row.metadata as Record<string, unknown> | undefined,
      summary: summarizeTeamActivityEntry({ kind: "agent", action: row.action, metadata: row.metadata as Record<string, unknown> | undefined }),
      createdAt: row.createdAt.toISOString(),
    })),
  ]
    .filter((item) => (type === "all" ? true : item.kind === type))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const paginated = paginateArray(merged, params.page, params.limit);

  return {
    items: paginated.items,
    pagination: paginated.pagination,
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
    postLikesReceived: credit.postLikesReceived,
    projectBookmarksReceived: credit.projectBookmarksReceived,
    followerCount: credit.followerCount,
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
    const postLikesReceived = mockPostLikes.filter((like) => mockPosts.some((post) => post.id === like.postId && post.authorId === userId)).length;
    const projectBookmarksReceived = mockProjectBookmarks.filter((bookmark) =>
      mockProjects.some((project) => {
        if (project.id !== bookmark.projectId) return false;
        const creator = mockCreators.find((creatorRow) => creatorRow.id === project.creatorId);
        return creator?.userId === userId;
      })
    ).length;
    const followerCount = mockUserFollows.filter((follow) => follow.followingId === userId).length;

    const score =
      tasksCompleted * 10 +
      milestonesHit * 25 +
      postsAuthored * 15 +
      commentsAuthored * 5 +
      projectsCreated * 20 +
      intentsApproved * 10 +
      joinRequestsMade * 3 +
      postLikesReceived * 2 +
      projectBookmarksReceived * 3 +
      followerCount * 4;

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
      postLikesReceived,
      projectBookmarksReceived,
      followerCount,
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
  const [tasksCompleted, milestonesHit, joinRequestsMade, postsAuthored, commentsAuthored, projectsCreated, intentsApproved, postLikesReceived, projectBookmarksReceived, followerCount] =
    await Promise.all([
      prisma.teamTask.count({ where: { OR: [{ assigneeUserId: userId }, { createdByUserId: userId }], status: "done" } }),
      prisma.teamMilestone.count({ where: { createdByUserId: userId, completed: true } }),
      prisma.teamJoinRequest.count({ where: { applicantId: userId } }),
      prisma.post.count({ where: { authorId: userId, reviewStatus: "approved" } }),
      prisma.comment.count({ where: { authorId: userId } }),
      prisma.project.count({ where: { creator: { userId } } }),
      prisma.collaborationIntent.count({ where: { applicantId: userId, status: "approved" } }),
      prisma.postLike.count({ where: { post: { authorId: userId } } }),
      prisma.projectBookmark.count({ where: { project: { creator: { userId } } } }),
      prisma.userFollow.count({ where: { followingId: userId } }),
    ]);

  const score =
    tasksCompleted * 10 +
    milestonesHit * 25 +
    postsAuthored * 15 +
    commentsAuthored * 5 +
    projectsCreated * 20 +
    intentsApproved * 10 +
    joinRequestsMade * 3 +
    postLikesReceived * 2 +
    projectBookmarksReceived * 3 +
    followerCount * 4;

  const credit = await prisma.contributionCredit.upsert({
    where: { userId },
    update: { score, tasksCompleted, milestonesHit, joinRequestsMade, postsAuthored, commentsAuthored, projectsCreated, intentsApproved, postLikesReceived, projectBookmarksReceived, followerCount },
    create: { userId, score, tasksCompleted, milestonesHit, joinRequestsMade, postsAuthored, commentsAuthored, projectsCreated, intentsApproved, postLikesReceived, projectBookmarksReceived, followerCount },
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
    postLikesReceived: credit.postLikesReceived,
    projectBookmarksReceived: credit.projectBookmarksReceived,
    followerCount: credit.followerCount,
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
    postLikesReceived: c.postLikesReceived,
    projectBookmarksReceived: c.projectBookmarksReceived,
    followerCount: c.followerCount,
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
