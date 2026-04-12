import { paginateArray } from "@/lib/pagination";
import {
  mockComments,
  mockCreators,
  mockPosts,
  mockProjects,
  mockUsers,
} from "@/lib/data/mock-data";
import type { Comment, CreatorProfile, Post, Project, Role } from "@/lib/types";

const useMockData = process.env.USE_MOCK_DATA !== "false";
type DemoRole = Extract<Role, "admin" | "user">;

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

async function getPrisma() {
  const db = await import("@/lib/db");
  return db.prisma;
}

function toProjectDto(project: {
  id: string;
  slug: string;
  creatorId: string;
  title: string;
  oneLiner: string;
  description: string;
  techStack: string[];
  tags: string[];
  status: Project["status"];
  demoUrl: string | null;
  updatedAt: Date;
}): Project {
  return {
    ...project,
    demoUrl: project.demoUrl ?? undefined,
    updatedAt: project.updatedAt.toISOString(),
  };
}

function toCreatorDto(creator: {
  id: string;
  slug: string;
  userId: string;
  headline: string;
  bio: string;
  skills: string[];
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
    collaborationPreference: allowedPreference,
  };
}

function toPostDto(post: {
  id: string;
  slug: string;
  authorId: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: Date;
}): Post {
  return {
    ...post,
    createdAt: post.createdAt.toISOString(),
  };
}

function toCommentDto(comment: {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}): Comment {
  return {
    ...comment,
    createdAt: comment.createdAt.toISOString(),
  };
}

export async function listProjects(params: {
  query?: string;
  tag?: string;
  page: number;
  limit: number;
}): Promise<Paginated<Project>> {
  if (useMockData) {
    const filtered = mockProjects.filter((project) => {
      const q = params.query?.toLowerCase().trim();
      const t = params.tag?.toLowerCase().trim();

      const queryMatch =
        !q ||
        project.title.toLowerCase().includes(q) ||
        project.description.toLowerCase().includes(q) ||
        project.tags.some((tag) => tag.toLowerCase().includes(q));

      const tagMatch = !t || project.tags.some((tag) => tag.toLowerCase() === t);

      return queryMatch && tagMatch;
    });

    return paginateArray(filtered, params.page, params.limit);
  }

  const where = {
    AND: [
      params.query
        ? {
            OR: [
              { title: { contains: params.query, mode: "insensitive" as const } },
              { description: { contains: params.query, mode: "insensitive" as const } },
            ],
          }
        : {},
      params.tag
        ? {
            tags: {
              has: params.tag,
            },
          }
        : {},
    ],
  };

  const [items, total] = await Promise.all([
    (await getPrisma()).project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    (await getPrisma()).project.count({ where }),
  ]);

  return {
    items: items.map(toProjectDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  if (useMockData) {
    return mockProjects.find((project) => project.slug === slug) ?? null;
  }

  const prisma = await getPrisma();
  const project = await prisma.project.findUnique({
    where: { slug },
  });
  return project ? toProjectDto(project) : null;
}

export async function listCreators(params: { query?: string; page: number; limit: number }) {
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

  const where = params.query
    ? {
        OR: [
          { slug: { contains: params.query, mode: "insensitive" as const } },
          { bio: { contains: params.query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    (await getPrisma()).creatorProfile.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    (await getPrisma()).creatorProfile.count({ where }),
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

export async function listPosts(params: {
  query?: string;
  tag?: string;
  page: number;
  limit: number;
}): Promise<Paginated<Post>> {
  if (useMockData) {
    const filtered = mockPosts.filter((post) => {
      const q = params.query?.toLowerCase().trim();
      const t = params.tag?.toLowerCase().trim();
      const queryMatch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.body.toLowerCase().includes(q) ||
        post.tags.some((tag) => tag.toLowerCase().includes(q));
      const tagMatch = !t || post.tags.some((tag) => tag.toLowerCase() === t);
      return queryMatch && tagMatch;
    });

    return paginateArray(filtered, params.page, params.limit);
  }

  const where = {
    AND: [
      params.query
        ? {
            OR: [
              { title: { contains: params.query, mode: "insensitive" as const } },
              { body: { contains: params.query, mode: "insensitive" as const } },
            ],
          }
        : {},
      params.tag
        ? {
            tags: {
              has: params.tag,
            },
          }
        : {},
    ],
  };

  const [items, total] = await Promise.all([
    (await getPrisma()).post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    (await getPrisma()).post.count({ where }),
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

export async function createPost(input: {
  title: string;
  body: string;
  tags: string[];
  authorId: string;
}) {
  const slug = input.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  if (useMockData) {
    const post: Post = {
      id: `post_${Date.now()}`,
      slug: `${slug}-${Date.now()}`,
      authorId: input.authorId,
      title: input.title,
      body: input.body,
      tags: input.tags,
      createdAt: new Date().toISOString(),
    };
    mockPosts.unshift(post);
    return post;
  }

  const prisma = await getPrisma();
  const post = await prisma.post.create({
    data: {
      slug: `${slug}-${Date.now()}`,
      title: input.title,
      body: input.body,
      tags: input.tags,
      authorId: input.authorId,
    },
  });
  return toPostDto(post);
}

export async function createComment(input: { postId: string; body: string; authorId: string }) {
  if (useMockData) {
    const postExists = mockPosts.some((post) => post.id === input.postId);
    if (!postExists) {
      throw new Error("POST_NOT_FOUND");
    }

    const comment: Comment = {
      id: `cm_${Date.now()}`,
      postId: input.postId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    mockComments.unshift(comment);
    return comment;
  }

  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: { id: true },
  });
  if (!post) {
    throw new Error("POST_NOT_FOUND");
  }

  const comment = await prisma.comment.create({
    data: {
      postId: input.postId,
      body: input.body,
      authorId: input.authorId,
    },
  });
  return toCommentDto(comment);
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
  };
}
