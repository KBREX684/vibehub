import { describe, it, expect, afterEach } from "vitest";
import * as mockRepo from "@/lib/repositories/community/mock-post.repository";
import * as prismaRepo from "@/lib/repositories/community/prisma-post.repository";
import {
  getPostBySlug,
  listPosts,
  setCommunityPostRepository,
} from "@/lib/repositories/community/community-post-repository";

describe("P2-BE-2: CommunityPostRepository (mock + Prisma implementations)", () => {
  afterEach(() => {
    setCommunityPostRepository(null);
  });

  const mockImpl = {
    listPosts: mockRepo.listPostsMock,
    getPostBySlug: mockRepo.getPostBySlugMock,
    createPost: mockRepo.createPostMock,
  };

  const prismaImpl = {
    listPosts: prismaRepo.listPosts,
    getPostBySlug: prismaRepo.getPostBySlug,
    createPost: prismaRepo.createPost,
  };

  it("mock: listPosts page 1 returns items", async () => {
    const page = await mockImpl.listPosts({ page: 1, limit: 5 });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.pagination.page).toBe(1);
  });

  it("factory + mock: routes through getCommunityPostRepository", async () => {
    setCommunityPostRepository(mockImpl);
    const page = await listPosts({ page: 1, limit: 5 });
    expect(page.items.length).toBeGreaterThan(0);
  });

  it("mock: getPostBySlug returns known fixture slug", async () => {
    setCommunityPostRepository(mockImpl);
    const p = await getPostBySlug("how-i-built-an-agent-ready-project-page");
    expect(p?.slug).toBe("how-i-built-an-agent-ready-project-page");
  });

  it("prisma: listPosts is callable when DATABASE_URL is available", async () => {
    if (!process.env.DATABASE_URL?.trim()) {
      return;
    }
    const page = await prismaImpl.listPosts({ page: 1, limit: 3 });
    expect(Array.isArray(page.items)).toBe(true);
    expect(page.pagination.total).toBeGreaterThanOrEqual(0);
  });
});
