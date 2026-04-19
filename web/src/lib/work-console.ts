import type {
  CollaborationIntent,
  WorkAgentTaskItem,
  WorkAgentTaskStatus,
  WorkIntentInboxItem,
  WorkIntentTab,
  WorkLibraryItem,
  WorkspaceSummary,
} from "@/lib/types";
import {
  listAgentConfirmationRequestsForUser,
  listAgentTasksForUser,
  listInAppNotifications,
} from "@/lib/repository";
import {
  mockCollaborationIntents,
  mockCreators,
  mockProjects,
  mockUsers,
} from "@/lib/data/mock-data";
import {
  deriveIntentExpiresAt,
  normalizeCollaborationIntentStatus,
  normalizeStructuredIntentFields,
} from "@/lib/collaboration-intents";
import { getPrisma, useMockData } from "@/lib/repositories/repository-shared";
import { listAccessibleWorkspacesForUser } from "@/lib/repositories/workspace.repository";

export function normalizeCollaborationIntent(intent: CollaborationIntent): CollaborationIntent {
  const normalized: CollaborationIntent = { ...intent };
  if (!normalized.expiresAt) {
    normalized.expiresAt = deriveIntentExpiresAt(intent.createdAt);
  }
  const fields = normalizeStructuredIntentFields(intent);
  normalized.pitch = fields.pitch;
  normalized.whyYou = fields.whyYou;
  normalized.howCollab = fields.howCollab;
  normalized.status = normalizeCollaborationIntentStatus(normalized.status, normalized.expiresAt);
  return normalized;
}

function inferLibraryStatus(project: WorkLibraryItem): "draft" | "public" | "private" | "open-source" | "archived" {
  if (project.openSource) return "open-source";
  if (project.status === "paused") return "archived";
  if (project.status === "launched") return "public";
  if (project.teamId) return "private";
  return "draft";
}

function getWorkspaceLabelForProject(
  project: { team?: { slug: string; name: string } | null | undefined; teamId?: string | null },
  workspace?: Pick<WorkspaceSummary, "kind" | "title" | "slug" | "teamSlug">
) {
  if (workspace?.kind === "team") {
    return {
      workspaceTitle: workspace.title,
      workspaceSlug: workspace.teamSlug ?? workspace.slug,
      workspaceKind: "team" as const,
    };
  }
  if (workspace?.kind === "personal") {
    return {
      workspaceTitle: workspace.title,
      workspaceSlug: "personal",
      workspaceKind: "personal" as const,
    };
  }
  if (project.team) {
    return {
      workspaceTitle: project.team.name,
      workspaceSlug: project.team.slug,
      workspaceKind: "team" as const,
    };
  }
  return {
    workspaceTitle: "个人工作区",
    workspaceSlug: "personal",
    workspaceKind: "personal" as const,
  };
}

export async function listWorkspaceSummariesForUser(userId: string): Promise<WorkspaceSummary[]> {
  return listAccessibleWorkspacesForUser(userId);
}

export async function getWorkShellBadges(userId: string) {
  const [notifications, confirmations, intents] = await Promise.all([
    listInAppNotifications({ userId, limit: 120 }),
    listAgentConfirmationRequestsForUser({ userId, page: 1, limit: 100, status: "pending" }),
    listWorkCollaborationInbox({ userId, tab: "received" }),
  ]);
  return {
    unreadNotifications: notifications.filter((item) => !item.readAt).length,
    pendingConfirmations: confirmations.pagination.total,
    receivedIntents: intents.length,
  };
}

export async function listWorkLibraryItems(params: {
  userId: string;
  status?: "draft" | "public" | "private" | "open-source" | "archived";
  query?: string;
}): Promise<WorkLibraryItem[]> {
  let rows: WorkLibraryItem[] = [];

  if (useMockData) {
    const workspaces = await listAccessibleWorkspacesForUser(params.userId);
    const workspaceMap = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
    const ownedCreatorIds = new Set(mockCreators.filter((creator) => creator.userId === params.userId).map((creator) => creator.id));
    const teamSlugSet = new Set(workspaces.filter((workspace) => workspace.kind === "team" && workspace.teamSlug).map((workspace) => workspace.teamSlug!));
    const query = params.query?.trim().toLowerCase();
    const seen = new Set<string>();

    rows = mockProjects
      .filter((project) => {
        const owned = ownedCreatorIds.has(project.creatorId);
        const teamVisible = project.team?.slug ? teamSlugSet.has(project.team.slug) : false;
        if (!owned && !teamVisible) return false;
        if (!query) return true;
        const haystack = [project.title, project.oneLiner, project.description, ...project.tags, ...project.techStack]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .filter((project) => {
        if (seen.has(project.id)) return false;
        seen.add(project.id);
        return true;
      })
      .map((project) => {
        const workspace = workspaceMap.get(project.workspaceId ?? "") ?? undefined;
        const workspaceLabel = getWorkspaceLabelForProject(project, workspace);
        return {
          ...project,
          workspaceId: project.workspaceId ?? `${workspaceLabel.workspaceKind}:${workspaceLabel.workspaceSlug}`,
          visibility: project.openSource ? "public" : project.status === "launched" ? "public" : project.teamId ? "private" : "draft",
          workspaceTitle: workspaceLabel.workspaceTitle,
          workspaceSlug: workspaceLabel.workspaceSlug,
          workspaceKind: workspaceLabel.workspaceKind,
          collaborationIntentCount: project.collaborationIntentCount ?? 0,
        } satisfies WorkLibraryItem;
      });
  } else {
    const prisma = await getPrisma();
    const workspaces = await listAccessibleWorkspacesForUser(params.userId);
    const workspaceIds = workspaces.map((workspace) => workspace.id);
    const workspaceMap = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
    const query = params.query?.trim().toLowerCase();
    const dbRows = await prisma.project.findMany({
      where: {
        OR: [
          { workspaceId: { in: workspaceIds } },
          { AND: [{ workspaceId: null }, { creator: { userId: params.userId } }] },
          { AND: [{ workspaceId: null }, { team: { memberships: { some: { userId: params.userId } } } }] },
        ],
      },
      include: {
        team: { select: { slug: true, name: true } },
        workspace: {
          select: {
            id: true,
            kind: true,
            slug: true,
            title: true,
            userId: true,
            teamId: true,
            user: { select: { name: true } },
            team: { select: { slug: true, name: true, mission: true, _count: { select: { memberships: true } } } },
          },
        },
        _count: { select: { collaborationIntents: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    rows = dbRows
      .filter((project) => {
        if (!query) return true;
        const haystack = [project.title, project.oneLiner, project.description, ...project.tags, ...project.techStack]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .map((project) => {
        const workspace =
          (project.workspaceId ? workspaceMap.get(project.workspaceId) : undefined) ??
          (project.workspace ? {
            id: project.workspace.id,
            kind: project.workspace.kind,
            slug: project.workspace.slug,
            title: project.workspace.title,
            subtitle: project.workspace.team?.mission ?? project.workspace.user?.name,
            teamSlug: project.workspace.team?.slug,
            memberCount: project.workspace.team?._count.memberships,
          } : undefined);
        const workspaceLabel = getWorkspaceLabelForProject(project, workspace);
        return {
          id: project.id,
          slug: project.slug,
          creatorId: project.creatorId,
          teamId: project.teamId ?? undefined,
          workspaceId: project.workspaceId ?? `${workspaceLabel.workspaceKind}:${workspaceLabel.workspaceSlug}`,
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
          screenshots: project.screenshots,
          logoUrl: project.logoUrl ?? undefined,
          openSource: project.openSource,
          license: project.license ?? undefined,
          visibility: project.openSource ? "public" : project.status === "launched" ? "public" : project.teamId ? "private" : "draft",
          workspaceTitle: workspaceLabel.workspaceTitle,
          workspaceSlug: workspaceLabel.workspaceSlug,
          workspaceKind: workspaceLabel.workspaceKind,
          collaborationIntentCount: project._count.collaborationIntents,
          team: project.team ?? undefined,
          featuredAt: project.featuredAt?.toISOString(),
          featuredRank: project.featuredRank ?? undefined,
          updatedAt: project.updatedAt.toISOString(),
        } satisfies WorkLibraryItem;
      });
  }

  if (!params.status) return rows;
  return rows.filter((row) => inferLibraryStatus(row) === params.status);
}

function isExpired(intent: CollaborationIntent) {
  return normalizeCollaborationIntentStatus(intent.status, intent.expiresAt) === "expired";
}

export async function listWorkCollaborationInbox(params: {
  userId: string;
  tab: WorkIntentTab;
}): Promise<WorkIntentInboxItem[]> {
  let intents: WorkIntentInboxItem[] = [];

  if (useMockData) {
    const mockIntents: WorkIntentInboxItem[] = [];
    for (const intent of mockCollaborationIntents) {
      const project = mockProjects.find((item) => item.id === intent.projectId);
      const applicant = mockUsers.find((item) => item.id === intent.applicantId);
      const creator = project ? mockCreators.find((item) => item.id === project.creatorId) : undefined;
      if (!project || !applicant) continue;
      const normalized = normalizeCollaborationIntent(intent);
      mockIntents.push({
        ...normalized,
        applicantName: applicant.name,
        applicantEmail: applicant.email,
        projectSlug: project.slug,
        projectTitle: project.title,
        ownerUserId: creator?.userId,
      });
    }
    intents = mockIntents;
  } else {
    const prisma = await getPrisma();
    const rows = await prisma.collaborationIntent.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        applicant: { select: { id: true, name: true, email: true } },
        project: {
          select: {
            slug: true,
            title: true,
            creator: { select: { userId: true } },
          },
        },
      },
      take: 200,
    });
    intents = rows.map((row) => {
      const normalized = normalizeCollaborationIntent({
        id: row.id,
        projectId: row.projectId,
        applicantId: row.applicantId,
        intentType: row.intentType,
        message: row.message,
        pitch: row.pitch ?? undefined,
        whyYou: row.whyYou ?? undefined,
        howCollab: row.howCollab ?? undefined,
        contact: row.contact ?? undefined,
        status: normalizeCollaborationIntentStatus(row.status, row.expiresAt?.toISOString()),
        reviewNote: row.reviewNote ?? undefined,
        reviewedAt: row.reviewedAt?.toISOString(),
        reviewedBy: row.reviewedBy ?? undefined,
        expiresAt: row.expiresAt?.toISOString(),
        convertedToTeamMembership: row.convertedToTeamMembership,
        createdAt: row.createdAt.toISOString(),
      });
      return {
        ...normalized,
        applicantName: row.applicant.name,
        applicantEmail: row.applicant.email,
        projectSlug: row.project.slug,
        projectTitle: row.project.title,
        ownerUserId: row.project.creator.userId,
      } satisfies WorkIntentInboxItem;
    });
  }

  return intents.filter((intent) => {
    const ownedByUser = intent.ownerUserId === params.userId;
    const sentByUser = intent.applicantId === params.userId;
    const expired = isExpired(intent);
    switch (params.tab) {
      case "received":
        return ownedByUser && intent.status === "pending" && !expired;
      case "sent":
        return sentByUser && intent.status === "pending" && !expired;
      case "accepted":
        return (ownedByUser || sentByUser) && intent.status === "approved";
      case "declined":
        return (ownedByUser || sentByUser) && ["rejected", "ignored", "blocked"].includes(intent.status);
      case "expired":
        return (ownedByUser || sentByUser) && expired;
      default:
        return false;
    }
  });
}

export async function listWorkAgentTasks(params: {
  userId: string;
  status?: WorkAgentTaskStatus;
  scope?: "personal" | "team";
}): Promise<WorkAgentTaskItem[]> {
  return listAgentTasksForUser(params);
}
