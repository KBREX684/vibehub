import type {
  AuditLog,
  Comment,
  CollaborationIntent,
  CreatorProfile,
  InAppNotificationKind,
  ModerationCase,
  Post,
  Project,
  ReportTicket,
  TeamJoinRequestStatus,
  TeamRole,
  TeamTaskStatus,
  User,
} from "@/lib/types";

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
  { id: "u1", email: "alice@vibehub.dev", name: "Alice", role: "admin", githubId: 1001, githubUsername: "alice-ai", avatarUrl: "https://avatars.githubusercontent.com/u/1001" },
  { id: "u2", email: "bob@vibehub.dev", name: "Bob", role: "user", githubId: 1002, githubUsername: "bob-solo", avatarUrl: "https://avatars.githubusercontent.com/u/1002" },
  { id: "u3", email: "chen@vibehub.dev", name: "Chen", role: "user", githubId: 1003, githubUsername: "chen-dev", avatarUrl: "https://avatars.githubusercontent.com/u/1003" },
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
    repoUrl: "https://github.com/vibehub/vibehub",
    websiteUrl: "https://vibehub.dev",
    screenshots: [],
    logoUrl: undefined,
    openSource: true,
    license: "MIT",
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
    screenshots: [],
    openSource: false,
    updatedAt: new Date().toISOString(),
  },
];

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

// C-1: in-memory social interaction stores
export const mockPostLikes: Array<{ id: string; userId: string; postId: string; createdAt: string }> = [];
export const mockPostBookmarks: Array<{ id: string; userId: string; postId: string; createdAt: string }> = [];
export const mockProjectBookmarks: Array<{ id: string; userId: string; projectId: string; createdAt: string }> = [];
export const mockUserFollows: Array<{ id: string; followerId: string; followingId: string; createdAt: string }> = [];
