import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const alice = await prisma.user.upsert({
    where: { email: "alice@vibehub.dev" },
    update: {},
    create: {
      email: "alice@vibehub.dev",
      name: "Alice",
      role: "admin",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@vibehub.dev" },
    update: {},
    create: {
      email: "bob@vibehub.dev",
      name: "Bob",
      role: "user",
    },
  });

  await prisma.enterpriseProfile.upsert({
    where: { userId: alice.id },
    update: {},
    create: { userId: alice.id, status: "none" },
  });
  await prisma.enterpriseProfile.upsert({
    where: { userId: bob.id },
    update: {},
    create: { userId: bob.id, status: "none" },
  });

  await prisma.creatorProfile.upsert({
    where: { userId: bob.id },
    update: {},
    create: {
      userId: bob.id,
      slug: "bob-solo-ops",
      headline: "Solo founder and growth engineer",
      bio: "Building creator tools and operational automation for one-person companies.",
      skills: ["Growth", "Node.js", "Data Analytics"],
      collaborationPreference: "invite_only",
    },
  });

  const creator = await prisma.creatorProfile.upsert({
    where: { userId: alice.id },
    update: {},
    create: {
      userId: alice.id,
      slug: "alice-ai-builder",
      headline: "Agent-native full-stack builder",
      bio: "Building VibeHub as a full-stack product",
      skills: ["Next.js", "Prisma", "Product Strategy"],
      collaborationPreference: "open",
    },
  });

  await prisma.project.upsert({
    where: { slug: "vibehub" },
    update: {
      featuredRank: 1,
      featuredAt: new Date(),
    },
    create: {
      slug: "vibehub",
      creatorId: creator.id,
      title: "VibeHub",
      oneLiner: "Community + Showcase + Teaming",
      description: "P1 full-stack MVP",
      techStack: ["Next.js", "PostgreSQL", "Prisma"],
      tags: ["community", "showcase", "agent"],
      status: "building",
      featuredRank: 1,
      featuredAt: new Date(),
    },
  });

  await prisma.post.upsert({
    where: { slug: "vibehub-p1-kickoff" },
    update: {
      reviewStatus: "approved",
      reviewedBy: alice.id,
      reviewedAt: new Date(),
      moderationNote: "Seed approved content",
    },
    create: {
      slug: "vibehub-p1-kickoff",
      authorId: bob.id,
      title: "VibeHub P1 kickoff",
      body: "P1 now includes discussion square, project gallery and MCP v1 APIs.",
      tags: ["kickoff", "p1", "build-log"],
      reviewStatus: "approved",
      reviewedBy: alice.id,
      reviewedAt: new Date(),
      moderationNote: "Seed approved content",
    },
  });

  const pendingPost = await prisma.post.upsert({
    where: { slug: "needs-moderation-sample" },
    update: {
      reviewStatus: "pending",
      moderationNote: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    create: {
      slug: "needs-moderation-sample",
      authorId: bob.id,
      title: "Needs moderation sample",
      body: "This post is seeded as pending to test admin moderation workflow.",
      tags: ["moderation", "p2"],
      reviewStatus: "pending",
    },
  });

  await prisma.moderationCase.create({
    data: {
      targetType: "post",
      targetId: pendingPost.id,
      postId: pendingPost.id,
      status: "pending",
      reason: "seed_pending_content",
    },
  });

  await prisma.reportTicket.create({
    data: {
      targetType: "post",
      targetId: pendingPost.id,
      postId: pendingPost.id,
      reporterId: bob.id,
      reason: "Seed report ticket for moderation flow",
      status: "open",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: alice.id,
      action: "seed_initialized",
      entityType: "post",
      entityId: pendingPost.id,
      metadata: { stage: "p2-1" },
    },
  });

  const vibehubProject = await prisma.project.findUnique({
    where: { slug: "vibehub" },
    select: { id: true },
  });

  if (vibehubProject) {
    await prisma.collaborationIntent.create({
      data: {
        projectId: vibehubProject.id,
        applicantId: bob.id,
        intentType: "join",
        message: "Can support backend API module and testing workflow for P2.",
        contact: "bob@vibehub.dev",
        status: "pending",
      },
    });
  }

  const seedTeam = await prisma.team.upsert({
    where: { slug: "vibehub-core" },
    update: {
      name: "VibeHub Core",
      mission: "Seed team for P3 Team MVP (owner Alice, member Bob).",
    },
    create: {
      slug: "vibehub-core",
      name: "VibeHub Core",
      mission: "Seed team for P3 Team MVP (owner Alice, member Bob).",
      ownerUserId: alice.id,
    },
  });

  await prisma.teamMembership.upsert({
    where: {
      teamId_userId: { teamId: seedTeam.id, userId: alice.id },
    },
    update: { role: "owner" },
    create: { teamId: seedTeam.id, userId: alice.id, role: "owner" },
  });

  await prisma.teamMembership.upsert({
    where: {
      teamId_userId: { teamId: seedTeam.id, userId: bob.id },
    },
    update: { role: "member" },
    create: { teamId: seedTeam.id, userId: bob.id, role: "member" },
  });

  await prisma.project.update({
    where: { slug: "vibehub" },
    data: { teamId: seedTeam.id },
  });

  await prisma.userFollow.upsert({
    where: {
      followerId_followingId: { followerId: bob.id, followingId: alice.id },
    },
    update: {},
    create: { followerId: bob.id, followingId: alice.id },
  });

  await prisma.teamTask.deleteMany({ where: { teamId: seedTeam.id } });
  await prisma.teamMilestone.deleteMany({ where: { teamId: seedTeam.id } });
  await prisma.teamMilestone.createMany({
    data: [
      {
        teamId: seedTeam.id,
        title: "P3 collaboration slice GA",
        description: "Teams, tasks, milestones in production",
        targetDate: new Date(Date.UTC(2026, 5, 1)),
        completed: false,
        sortOrder: 0,
        createdByUserId: alice.id,
      },
      {
        teamId: seedTeam.id,
        title: "First community launch review",
        targetDate: new Date(Date.UTC(2026, 7, 15)),
        completed: false,
        sortOrder: 1,
        createdByUserId: alice.id,
      },
    ],
  });
  const seedMilestones = await prisma.teamMilestone.findMany({
    where: { teamId: seedTeam.id },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const primaryMilestoneId = seedMilestones[0]?.id;

  await prisma.teamTask.createMany({
    data: [
      {
        teamId: seedTeam.id,
        title: "Review weekly ops checklist",
        description: "P3-4 seed task for team task board",
        status: "todo",
        sortOrder: 0,
        milestoneId: primaryMilestoneId ?? null,
        createdByUserId: alice.id,
        assigneeUserId: bob.id,
      },
      {
        teamId: seedTeam.id,
        title: "Link next project to this team",
        status: "doing",
        sortOrder: 1,
        createdByUserId: alice.id,
      },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
