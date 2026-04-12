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
    update: {},
    create: {
      slug: "vibehub",
      creatorId: creator.id,
      title: "VibeHub",
      oneLiner: "Community + Showcase + Teaming",
      description: "P1 full-stack MVP",
      techStack: ["Next.js", "PostgreSQL", "Prisma"],
      tags: ["community", "showcase", "agent"],
      status: "building",
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
