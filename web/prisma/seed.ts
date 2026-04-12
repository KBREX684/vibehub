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
    update: {},
    create: {
      slug: "vibehub-p1-kickoff",
      authorId: bob.id,
      title: "VibeHub P1 kickoff",
      body: "P1 now includes discussion square, project gallery and MCP v1 APIs.",
      tags: ["kickoff", "p1", "build-log"],
    },
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
