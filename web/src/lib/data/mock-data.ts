import type {
  AuditLog,
  Comment,
  CollaborationIntent,
  CreatorProfile,
  ModerationCase,
  Post,
  Project,
  ReportTicket,
  TeamRole,
  User,
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
