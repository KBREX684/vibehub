import type {
  AdminAiSuggestionRecord,
  AigcStamp,
  AigcProviderApi,
  AgentActionAuditRow,
  AgentConfirmationRequest,
  AuditLog,
  Challenge,
  ChallengeStatus,
  Comment,
  CollaborationIntent,
  ContributionCreditProfile,
  CreatorProfile,
  LedgerEntry,
  InAppNotificationKind,
  McpInvokeAuditRow,
  ModerationCase,
  OpcProfile,
  OpcTrustMetric,
  PmfEvent,
  Post,
  Project,
  ReportTicket,
  WorkspaceSnapshot,
  WorkspaceArtifact,
  WorkspaceDeliverable,
  WorkAgentTaskStatus,
  SubscriptionPlanInfo,
  SubscriptionTier,
  SystemAlertRecord,
  TeamJoinRequestStatus,
  TeamDiscussion,
  TeamRole,
  TeamTaskComment,
  TeamTaskStatus,
  User,
} from "@/lib/types";
import { createPersistedArray } from "@/lib/data/mock-persist";

// P3: SubscriptionPlanInfo and UserSubscriptionInfo for mock data
export interface MockUserSubscriptionInfo {
  id: string;
  userId: string;
  plan: SubscriptionPlanInfo;
  status: "active" | "canceled" | "past_due";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt?: string;
}

export type EnterpriseVerificationStatus = "none" | "pending" | "approved" | "rejected";

export interface MockEnterpriseProfile {
  id: string;
  userId: string;
  status: EnterpriseVerificationStatus;
  organizationName: string;
  organizationWebsite: string;
  workEmail: string;
  useCase?: string;
  reviewedBy?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockEnterpriseVerificationApplication {
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

export interface MockWorkspacePreference {
  workspaceId: string;
  aigcAutoStamp?: boolean;
  aigcProvider?: AigcProviderApi;
  ledgerEnabled?: boolean;
}

export interface MockTeam {
  id: string;
  slug: string;
  name: string;
  mission?: string;
  ownerUserId: string;
  discordUrl?: string;
  telegramUrl?: string;
  slackUrl?: string;
  githubOrgUrl?: string;
  githubRepoUrl?: string;
  createdAt: string;
}

export interface MockTeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
}

export interface MockTeamMilestone {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  targetDate: string;
  completed: boolean;
  sortOrder: number;
  visibility: "team_only" | "public";
  progress: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockTeamTask {
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
}

export interface MockTeamJoinRequest {
  id: string;
  teamId: string;
  applicantId: string;
  message: string;
  status: TeamJoinRequestStatus;
  reviewedAt?: string;
  createdAt: string;
}

export type MockTeamDiscussion = TeamDiscussion;

export type MockTeamTaskComment = TeamTaskComment;

export interface MockInAppNotification {
  id: string;
  userId: string;
  kind: InAppNotificationKind;
  title: string;
  body: string;
  readAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MockAgentTaskRecord {
  id: string;
  requesterUserId: string;
  agentBindingId: string;
  apiKeyId?: string;
  workspaceId?: string;
  teamId?: string;
  confirmationRequestId?: string;
  taskId?: string;
  title: string;
  subtitle: string;
  action: string;
  targetType: string;
  targetId: string;
  status: WorkAgentTaskStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const globalMockState = globalThis as typeof globalThis & {
  __vibehubMockAdminAiSuggestions?: AdminAiSuggestionRecord[];
  __vibehubMockSystemAlerts?: SystemAlertRecord[];
};

export const mockInAppNotifications: MockInAppNotification[] =
  createPersistedArray<MockInAppNotification>("inAppNotifications");
export const mockAgentActionAudits: AgentActionAuditRow[] =
  createPersistedArray<AgentActionAuditRow>("agentActionAudits");
export const mockAgentConfirmationRequests: AgentConfirmationRequest[] =
  createPersistedArray<AgentConfirmationRequest>("agentConfirmationRequests");
export const mockMcpInvokeAudits: McpInvokeAuditRow[] =
  createPersistedArray<McpInvokeAuditRow>("mcpInvokeAudits");
export const mockAdminAiSuggestions: AdminAiSuggestionRecord[] =
  globalMockState.__vibehubMockAdminAiSuggestions ??
  (globalMockState.__vibehubMockAdminAiSuggestions = []);
export const mockSystemAlerts: SystemAlertRecord[] =
  globalMockState.__vibehubMockSystemAlerts ??
  (globalMockState.__vibehubMockSystemAlerts = []);
export const mockEnterpriseProfiles: MockEnterpriseProfile[] = [];
export const mockEnterpriseVerificationApplications: MockEnterpriseVerificationApplication[] = [];
export const mockTeamDiscussions: MockTeamDiscussion[] = [
  {
    id: "td1",
    teamId: "team1",
    authorId: "u1",
    authorName: "Alice",
    title: "Weekly delivery thread",
    body: "Use this thread to summarize what shipped this week, blockers, and what needs review before Friday.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
export const mockTeamTaskComments: MockTeamTaskComment[] = [
  {
    id: "ttc1",
    teamId: "team1",
    taskId: "tt1",
    authorId: "u2",
    authorName: "Bob",
    body: "Cron draft is working locally. Need one more pass on retry handling before merge.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockUsers: User[] = [
  {
    id: "u1",
    email: "alice@vibehub.dev",
    name: "Alice",
    role: "admin",
    createdAt: "2025-10-01T00:00:00.000Z",
    githubId: 1001,
    githubUsername: "alice-ai",
    avatarUrl: "https://avatars.githubusercontent.com/u/1001",
  },
  {
    id: "u2",
    email: "bob@vibehub.dev",
    name: "Bob",
    role: "user",
    createdAt: "2025-12-15T00:00:00.000Z",
    githubId: 1002,
    githubUsername: "bob-solo",
    avatarUrl: "https://avatars.githubusercontent.com/u/1002",
  },
  {
    id: "u3",
    email: "chen@vibehub.dev",
    name: "Chen",
    role: "user",
    createdAt: "2026-01-20T00:00:00.000Z",
    githubId: 1003,
    githubUsername: "chen-dev",
    avatarUrl: "https://avatars.githubusercontent.com/u/1003",
  },
];

export const mockCreators: CreatorProfile[] = [
  {
    id: "c1",
    slug: "alice-ai-builder",
    userId: "u1",
    headline: "Agent-native full-stack builder",
    bio: "Focusing on AI-native workflows, productized side projects, and rapid MVP delivery.",
    skills: ["Next.js", "Prisma", "Prompt Engineering", "Product Strategy"],
    avatarUrl: "https://avatars.githubusercontent.com/u/1001",
    websiteUrl: "https://vibehub.dev",
    githubUrl: "https://github.com/alice-ai",
    twitterUrl: "https://x.com/alice_ai",
    collaborationPreference: "open",
  },
  {
    id: "c2",
    slug: "bob-solo-ops",
    userId: "u2",
    headline: "Solo founder and growth engineer",
    bio: "Building creator tools and operational automation for one-person companies.",
    skills: ["Growth", "Node.js", "Data Analytics"],
    avatarUrl: "https://avatars.githubusercontent.com/u/1002",
    githubUrl: "https://github.com/bob-solo",
    linkedinUrl: "https://www.linkedin.com/in/bob-solo",
    collaborationPreference: "invite_only",
  },
];

const SEED_MOCK_PROJECTS: Project[] = [
  {
    id: "p1",
    slug: "vibehub",
    creatorId: "c1",
    teamId: "team1",
    team: { slug: "vibehub-core", name: "VibeHub Core" },
    title: "VibeHub",
    oneLiner: "Community + Showcase + Teaming for VibeCoding developers",
    description:
      "A full-stack hub where developers discuss ideas, showcase products, and form teams with AI-agent-ready metadata.",
    readmeMarkdown:
      "## VibeHub\n\nDeveloper-first **community** for shipping together.\n\n```bash\nnpm install && npm run dev\n```",
    techStack: ["Next.js", "PostgreSQL", "Prisma", "Tailwind CSS"],
    tags: ["community", "agent", "showcase"],
    status: "building",
    demoUrl: "https://example.com/vibehub",
    repoUrl: "https://github.com/vibehub/vibehub",
    websiteUrl: "https://vibehub.dev",
    screenshots: [],
    logoUrl: undefined,
    openSource: true,
    license: "MIT",
    updatedAt: new Date().toISOString(),
    featuredRank: 1,
    featuredAt: new Date().toISOString(),
  },
  {
    id: "p2",
    slug: "prompt-lab",
    creatorId: "c2",
    title: "Prompt Lab",
    oneLiner: "Prompt workflow testing for builders",
    description:
      "A sandbox for benchmarking and sharing prompt templates with practical implementation notes.",
    techStack: ["Next.js", "Supabase", "PostgreSQL"],
    tags: ["prompt", "workflow", "experiment"],
    status: "launched",
    demoUrl: "https://example.com/prompt-lab",
    screenshots: [],
    openSource: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "p3",
    slug: "signal-board",
    creatorId: "c1",
    title: "Signal Board",
    oneLiner: "Lightweight status pages for small teams",
    description:
      "A minimal status and incident board for indie teams who want transparency without enterprise tooling.",
    techStack: ["Next.js", "PostgreSQL"],
    tags: ["status", "teams", "ops"],
    status: "idea",
    screenshots: [],
    openSource: true,
    license: "MIT",
    /** Slightly older than p1/p2 so keyset order stays stable in tests */
    updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

function cloneSeedProjects(): Project[] {
  return SEED_MOCK_PROJECTS.map((p) => {
    const { team, techStack, tags, screenshots, ...rest } = p;
    return {
      ...rest,
      team: team ? { ...team } : undefined,
      techStack: [...techStack],
      tags: [...tags],
      screenshots: [...screenshots],
    };
  });
}

/** In Next.js dev, HMR re-evaluates modules and would reset mutable mock arrays; keep one store on globalThis. */
const mockProjectStore = globalThis as typeof globalThis & { __vibehubMockProjects?: Project[] };
export const mockProjects: Project[] =
  process.env.NODE_ENV === "development"
    ? (mockProjectStore.__vibehubMockProjects ??= cloneSeedProjects())
    : cloneSeedProjects();

export const mockWorkspaceSnapshots: WorkspaceSnapshot[] =
  createPersistedArray<WorkspaceSnapshot>("workspaceSnapshots");

export const mockWorkspaceArtifacts: WorkspaceArtifact[] =
  createPersistedArray<WorkspaceArtifact>("workspaceArtifacts");

export const mockAigcStamps: AigcStamp[] =
  createPersistedArray<AigcStamp>("aigcStamps");

export const mockWorkspacePreferences: MockWorkspacePreference[] =
  createPersistedArray<MockWorkspacePreference>("workspacePreferences");

export const mockOpcProfiles: OpcProfile[] =
  createPersistedArray<OpcProfile>("opcProfiles");

export const mockOpcTrustMetrics: OpcTrustMetric[] =
  createPersistedArray<OpcTrustMetric>("opcTrustMetrics");

export const mockLegalAttestationLinks: Array<{
  id: string;
  creatorProfileId: string;
  label: string;
  href: string;
  createdAt: string;
  updatedAt: string;
}> = createPersistedArray("legalAttestationLinks");

export const mockWorkspaceDeliverables: WorkspaceDeliverable[] =
  createPersistedArray<WorkspaceDeliverable>("workspaceDeliverables");

export const mockLedgerEntries: LedgerEntry[] =
  createPersistedArray<LedgerEntry>("ledgerEntries");

export const mockPmfEvents: PmfEvent[] =
  createPersistedArray<PmfEvent>("pmfEvents");

export const mockAgentTasks: MockAgentTaskRecord[] =
  createPersistedArray<MockAgentTaskRecord>("agentTasks");

export const mockPosts: Post[] = [
  {
    id: "post1",
    slug: "how-i-built-an-agent-ready-project-page",
    authorId: "u1",
    authorName: "Alice",
    title: "How I built an Agent-ready project page",
    body: "Sharing a practical structure for project metadata that both humans and agents can consume.",
    tags: ["agent", "metadata", "project-page"],
    reviewStatus: "approved",
    reviewedBy: "u1",
    reviewedAt: new Date().toISOString(),
    likeCount: 0,
    bookmarkCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "post2",
    slug: "weekly-vibecoding-stack-review",
    authorId: "u2",
    authorName: "Bob",
    title: "Weekly VibeCoding stack review",
    body: "My best stack picks this week for solo founders shipping fast.",
    tags: ["tech-stack", "weekly", "solo-founder"],
    reviewStatus: "approved",
    reviewedBy: "u1",
    reviewedAt: new Date().toISOString(),
    likeCount: 0,
    bookmarkCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "post3",
    slug: "need-review-agent-template",
    authorId: "u3",
    authorName: "Chen",
    title: "Need review: Agent prompt template",
    body: "Drafting an experimental template. Looking for moderator review before publishing.",
    tags: ["prompt", "review-needed"],
    reviewStatus: "pending",
    likeCount: 0,
    bookmarkCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "post4",
    slug: "shipping-with-confidence-in-small-teams",
    authorId: "u2",
    authorName: "Bob",
    title: "Shipping with confidence in small teams",
    body: "Practical checklist we use before every release: scope, rollback plan, and one happy-path smoke test.",
    tags: ["shipping", "teams", "quality"],
    reviewStatus: "approved",
    reviewedBy: "u1",
    reviewedAt: new Date().toISOString(),
    likeCount: 0,
    bookmarkCount: 0,
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  },
];

export const mockComments: Comment[] = [
  {
    id: "cm1",
    postId: "post1",
    authorId: "u3",
    authorName: "Chen",
    body: "Great breakdown. Could you share your schema for tags?",
    createdAt: new Date().toISOString(),
  },
  {
    id: "cm2",
    postId: "post2",
    authorId: "u1",
    authorName: "Alice",
    body: "Solid picks — would add a lightweight analytics hook for solo launches.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "cm3",
    postId: "post2",
    authorId: "u3",
    authorName: "Chen",
    body: "Thanks, adding observability early saved me weeks last quarter.",
    createdAt: new Date().toISOString(),
  },
];

export const mockModerationCases: ModerationCase[] = [
  {
    id: "mc1",
    targetType: "post",
    targetId: "post3",
    status: "pending",
    reason: "new_post_submission",
    createdAt: new Date().toISOString(),
  },
];

export const mockReportTickets: ReportTicket[] = [
  {
    id: "rt1",
    targetType: "post",
    targetId: "post3",
    reporterId: "u2",
    reason: "Needs moderation due to outbound links",
    status: "open",
    createdAt: new Date().toISOString(),
  },
];

export const mockAuditLogs: AuditLog[] = [];

export const mockTeams: MockTeam[] = [
  {
    id: "team1",
    slug: "vibehub-core",
    name: "VibeHub Core",
    mission: "Ship the community platform MVP and iterate with early adopters.",
    ownerUserId: "u1",
    createdAt: new Date().toISOString(),
  },
];

export const mockTeamJoinRequests: MockTeamJoinRequest[] = [];

const milestoneT1 = new Date(Date.UTC(2026, 5, 1)).toISOString();
const milestoneT2 = new Date(Date.UTC(2026, 7, 15)).toISOString();

export const mockTeamMilestones: MockTeamMilestone[] = [
  {
    id: "ms1",
    teamId: "team1",
    title: "P3 collaboration slice GA",
    description: "Teams, tasks, milestones live in prod.",
    targetDate: milestoneT1,
    completed: false,
    sortOrder: 0,
    visibility: "public",
    progress: 60,
    createdByUserId: "u1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ms2",
    teamId: "team1",
    title: "First community launch review",
    targetDate: milestoneT2,
    completed: false,
    sortOrder: 1,
    visibility: "team_only",
    progress: 0,
    createdByUserId: "u1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockTeamTasks: MockTeamTask[] = [
  {
    id: "tt1",
    teamId: "team1",
    title: "Ship weekly leaderboard materialize cron",
    description: "Optional scheduled job or doc for ops.",
    status: "doing",
    sortOrder: 0,
    milestoneId: "ms1",
    createdByUserId: "u1",
    assigneeUserId: "u2",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tt2",
    teamId: "team1",
    title: "Review join requests daily",
    status: "todo",
    sortOrder: 1,
    createdByUserId: "u1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tt3",
    teamId: "team1",
    title: "Review onboarding copy",
    description: "Reviewer should confirm the final onboarding flow wording before publish.",
    status: "review",
    sortOrder: 2,
    createdByUserId: "u1",
    assigneeUserId: "u2",
    reviewRequestedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockTeamMemberships: MockTeamMembership[] = [
  {
    id: "tm1",
    teamId: "team1",
    userId: "u1",
    role: "owner",
    joinedAt: new Date().toISOString(),
  },
  {
    id: "tm2",
    teamId: "team1",
    userId: "u2",
    role: "member",
    joinedAt: new Date().toISOString(),
  },
];

export const mockCollaborationIntents: CollaborationIntent[] = [
  {
    id: "ci1",
    projectId: "p1",
    applicantId: "u3",
    intentType: "join",
    message: "I want to contribute to API contracts and integration tests for VibeHub.",
    contact: "chen@vibehub.dev",
    status: "pending",
    convertedToTeamMembership: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "ci2",
    projectId: "p2",
    applicantId: "u1",
    intentType: "recruit",
    message: "Looking for a collaborator to ship prompt evaluation exports.",
    contact: "alice@vibehub.dev",
    status: "approved",
    convertedToTeamMembership: false,
    reviewedAt: new Date().toISOString(),
    reviewedBy: "u1",
    createdAt: new Date().toISOString(),
  },
];

// M-1: in-memory subscription store
export const mockSubscriptions: Array<{
  id: string;
  userId: string;
  tier: "free" | "pro";
  status: "active" | "past_due" | "canceled" | "trialing";
  paymentProvider?: "alipay";
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
}> = [
  // Admin user u1 gets pro so team-limit E2E tests pass
  { id: "sub_u1_pro", userId: "u1", tier: "pro", status: "active", paymentProvider: "alipay", cancelAtPeriodEnd: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export const mockBillingRecords: Array<{
  id: string;
  userId: string;
  subscriptionId?: string;
  paymentProvider: "alipay";
  tier: "free" | "pro";
  status: "pending" | "succeeded" | "failed" | "canceled" | "refunded";
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
}> = [];

// C-1: in-memory social interaction stores
export const mockPostLikes: Array<{ id: string; userId: string; postId: string; createdAt: string }> = [];
export const mockPostBookmarks: Array<{ id: string; userId: string; postId: string; createdAt: string }> = [];
export const mockProjectBookmarks: Array<{ id: string; userId: string; projectId: string; createdAt: string }> = [];
export const mockUserFollows: Array<{ id: string; followerId: string; followingId: string; createdAt: string }> = [
  {
    id: "f_u2_u1",
    followerId: "u2",
    followingId: "u1",
    createdAt: new Date().toISOString(),
  },
];

/** P3-3: in-memory webhook endpoints (USE_MOCK_DATA=true) */
export const mockWebhookEndpoints: Array<{
  id: string;
  userId: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}> = [];

export const mockOAuthApps: Array<{
  id: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  clientId: string;
  clientSecretHash: string;
  redirectUris: string[];
  scopes: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}> = [];

export const mockOAuthAuthorizationCodes: Array<{
  id: string;
  appId: string;
  userId: string;
  codeHash: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}> = [];

export const mockOAuthAccessTokens: Array<{
  id: string;
  appId: string;
  userId: string;
  tokenHash: string;
  prefix: string;
  scopes: string[];
  expiresAt: string;
  revokedAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}> = [];

export const mockAutomationWorkflows: Array<{
  id: string;
  userId: string;
  agentBindingId?: string;
  name: string;
  description?: string;
  triggerEvent: string;
  filterJson?: Record<string, unknown>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}> = [];

export const mockAutomationWorkflowSteps: Array<{
  id: string;
  workflowId: string;
  sortOrder: number;
  actionType: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}> = [];

export const mockAutomationWorkflowRuns: Array<{
  id: string;
  workflowId: string;
  userId: string;
  event: string;
  status: "pending" | "running" | "succeeded" | "failed" | "skipped";
  triggerPayload?: Record<string, unknown>;
  resultSummary?: string;
  createdAt: string;
  completedAt?: string;
}> = [];

// P2: Challenges
export const mockChallenges: Challenge[] = [
  {
    id: "ch1",
    slug: "vibecoding-week-2026-q2",
    title: "VibeCoding 周赛 2026-Q2",
    description: "在一周内完成一个 AI 辅助开发的 MVP 项目，提交到 VibeHub 并分享你的构建过程。",
    rules: "1. 项目必须在活动期间启动。\n2. 使用至少一种 AI 编程工具。\n3. 提交包含项目链接和构建日志的帖子。",
    tags: ["vibecoding", "mvp", "challenge"],
    status: "active" as ChallengeStatus,
    startDate: new Date(Date.UTC(2026, 3, 14)).toISOString(),
    endDate: new Date(Date.UTC(2026, 3, 21)).toISOString(),
    createdByUserId: "u1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ch2",
    slug: "prompt-engineering-battle",
    title: "Prompt 工程大赛",
    description: "设计最有效的 Prompt 模板，让 AI 生成高质量的代码和文档。社区投票决出优胜者。",
    tags: ["prompt", "competition"],
    status: "draft" as ChallengeStatus,
    startDate: new Date(Date.UTC(2026, 4, 1)).toISOString(),
    endDate: new Date(Date.UTC(2026, 4, 15)).toISOString(),
    createdByUserId: "u1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// P3: Contribution credits
export const mockContributionCredits: ContributionCreditProfile[] = [
  {
    userId: "u1",
    score: 420,
    tasksCompleted: 12,
    milestonesHit: 3,
    joinRequestsMade: 1,
    postsAuthored: 2,
    commentsAuthored: 5,
    projectsCreated: 3,
    intentsApproved: 2,
    postLikesReceived: 6,
    projectBookmarksReceived: 4,
    followerCount: 3,
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "u2",
    score: 180,
    tasksCompleted: 5,
    milestonesHit: 1,
    joinRequestsMade: 2,
    postsAuthored: 1,
    commentsAuthored: 3,
    projectsCreated: 1,
    intentsApproved: 0,
    postLikesReceived: 2,
    projectBookmarksReceived: 1,
    followerCount: 1,
    updatedAt: new Date().toISOString(),
  },
];

// P3: Subscription plans (display/reference data)
export const mockSubscriptionPlans: SubscriptionPlanInfo[] = [
  { id: "plan_free", tier: "free" as SubscriptionTier, name: "Free", description: "Full community access for developers.", priceMonthly: 0, features: ["Discussions", "Project gallery", "Basic search", "5 MCP tools", "60 API req/min"], apiQuota: 60 },
  { id: "plan_pro", tier: "pro" as SubscriptionTier, name: "Pro", description: "More space, more exposure, developer tools.", priceMonthly: 9, features: ["Everything in Free", "Unlimited projects", "Featured project slots", "All 9 MCP tools", "600 API req/min", "Pro badge", "Priority collab matching"], apiQuota: 600 },
];

// P3: User subscriptions (legacy P3 format; M-1 uses mockSubscriptions for Stripe-backed)
export const mockUserSubscriptions: MockUserSubscriptionInfo[] = [
  { id: "sub_1", userId: "u1", plan: mockSubscriptionPlans[1], status: "active", currentPeriodStart: new Date(Date.UTC(2026, 3, 1)).toISOString(), currentPeriodEnd: new Date(Date.UTC(2026, 4, 1)).toISOString() },
];

// ─── Team Chat ────────────────────────────────────────────────────────────────

export interface MockTeamChatMessage {
  id: string;
  teamId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export const mockTeamChatMessages: MockTeamChatMessage[] = [
  {
    id: "tcm1",
    teamId: "team1",
    authorId: "u1",
    body: "Welcome to the VibeHub Core team chat! 🚀",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "tcm2",
    teamId: "team1",
    authorId: "u2",
    body: "Hey everyone! Excited to collaborate here.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];
