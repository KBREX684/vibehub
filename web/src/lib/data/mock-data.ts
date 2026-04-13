import type {
  AuditLog,
  Challenge,
  ChallengeStatus,
  Comment,
  CollaborationIntent,
  ContributionCreditProfile,
  CreatorProfile,
  InAppNotificationKind,
  ModerationCase,
  Post,
  Project,
  ReportTicket,
  SubscriptionPlanInfo,
  SubscriptionTier,
  TeamJoinRequestStatus,
  TeamRole,
  TeamTaskStatus,
  User,
  UserSubscriptionInfo,
} from "@/lib/types";

export interface MockTeam {
  id: string;
  slug: string;
  name: string;
  mission?: string;
  ownerUserId: string;
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

export const mockInAppNotifications: MockInAppNotification[] = [];

export const mockUsers: User[] = [
  { id: "u1", email: "alice@vibehub.dev", name: "Alice", role: "admin" },
  { id: "u2", email: "bob@vibehub.dev", name: "Bob", role: "user" },
  { id: "u3", email: "chen@vibehub.dev", name: "Chen", role: "user" },
];

export const mockCreators: CreatorProfile[] = [
  {
    id: "c1",
    slug: "alice-ai-builder",
    userId: "u1",
    headline: "Agent-native full-stack builder",
    bio: "Focusing on AI-native workflows, productized side projects, and rapid MVP delivery.",
    skills: ["Next.js", "Prisma", "Prompt Engineering", "Product Strategy"],
    collaborationPreference: "open",
  },
  {
    id: "c2",
    slug: "bob-solo-ops",
    userId: "u2",
    headline: "Solo founder and growth engineer",
    bio: "Building creator tools and operational automation for one-person companies.",
    skills: ["Growth", "Node.js", "Data Analytics"],
    collaborationPreference: "invite_only",
  },
];

export const mockProjects: Project[] = [
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
    techStack: ["Next.js", "PostgreSQL", "Prisma", "Tailwind CSS"],
    tags: ["community", "agent", "showcase"],
    status: "building",
    demoUrl: "https://example.com/vibehub",
    updatedAt: new Date().toISOString(),
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
    updatedAt: new Date().toISOString(),
  },
];

export const mockPosts: Post[] = [
  {
    id: "post1",
    slug: "how-i-built-an-agent-ready-project-page",
    authorId: "u1",
    title: "How I built an Agent-ready project page",
    body: "Sharing a practical structure for project metadata that both humans and agents can consume.",
    tags: ["agent", "metadata", "project-page"],
    reviewStatus: "approved",
    reviewedBy: "u1",
    reviewedAt: new Date().toISOString(),
    featuredAt: new Date().toISOString(),
    featuredBy: "u1",
    createdAt: new Date().toISOString(),
  },
  {
    id: "post2",
    slug: "weekly-vibecoding-stack-review",
    authorId: "u2",
    title: "Weekly VibeCoding stack review",
    body: "My best stack picks this week for solo founders shipping fast.",
    tags: ["tech-stack", "weekly", "solo-founder"],
    reviewStatus: "approved",
    reviewedBy: "u1",
    reviewedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "post3",
    slug: "need-review-agent-template",
    authorId: "u3",
    title: "Need review: Agent prompt template",
    body: "Drafting an experimental template. Looking for moderator review before publishing.",
    tags: ["prompt", "review-needed"],
    reviewStatus: "pending",
    createdAt: new Date().toISOString(),
  },
];

export const mockComments: Comment[] = [
  {
    id: "cm1",
    postId: "post1",
    authorId: "u3",
    body: "Great breakdown. Could you share your schema for tags?",
    createdAt: new Date().toISOString(),
  },
  {
    id: "cm2",
    postId: "post2",
    authorId: "u1",
    body: "Solid picks — would add a lightweight analytics hook for solo launches.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "cm3",
    postId: "post2",
    authorId: "u3",
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
    reviewedAt: new Date().toISOString(),
    reviewedBy: "u1",
    createdAt: new Date().toISOString(),
  },
];

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
    updatedAt: new Date().toISOString(),
  },
];

export const mockSubscriptionPlans: SubscriptionPlanInfo[] = [
  {
    id: "plan_free",
    tier: "free" as SubscriptionTier,
    name: "Free",
    description: "社区基础功能，适合个人探索。",
    priceMonthly: 0,
    features: ["讨论广场", "项目画廊", "基础检索", "MCP v1 只读"],
    apiQuota: 120,
  },
  {
    id: "plan_pro",
    tier: "pro" as SubscriptionTier,
    name: "Pro",
    description: "个人 Pro：高级检索、深度分析、优先曝光、协作增强。",
    priceMonthly: 29,
    features: ["所有 Free 功能", "精华帖优先曝光", "高级项目检索", "API 配额 1000/分钟", "创作者成长面板"],
    apiQuota: 1000,
  },
  {
    id: "plan_team_pro",
    tier: "team_pro" as SubscriptionTier,
    name: "Team Pro",
    description: "团队 Pro：团队协作空间高级能力与管理能力。",
    priceMonthly: 99,
    features: ["所有 Pro 功能", "团队任务看板高级功能", "里程碑分析", "团队协作日志", "API 配额 5000/分钟", "优先客服"],
    apiQuota: 5000,
  },
];

export const mockUserSubscriptions: UserSubscriptionInfo[] = [
  {
    id: "sub_1",
    userId: "u1",
    plan: mockSubscriptionPlans[1],
    status: "active",
    currentPeriodStart: new Date(Date.UTC(2026, 3, 1)).toISOString(),
    currentPeriodEnd: new Date(Date.UTC(2026, 4, 1)).toISOString(),
  },
];
