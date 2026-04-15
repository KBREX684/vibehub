import { isMockDataEnabled } from "@/lib/runtime-mode";
import type { Post } from "@/lib/types";
import type { ListPostsParams, Paginated } from "./shared";
import * as mockRepo from "./mock-post.repository";
import * as prismaRepo from "./prisma-post.repository";

export type CommunityPostRepository = {
  listPosts: (params: ListPostsParams) => Promise<Paginated<Post>>;
  getPostBySlug: (slug: string, options?: { viewerUserId?: string }) => Promise<Post | null>;
  createPost: (input: { title: string; body: string; tags: string[]; authorId: string }) => Promise<Post>;
};

let _impl: CommunityPostRepository | null = null;

function defaultImpl(): CommunityPostRepository {
  const mock = isMockDataEnabled();
  return {
    listPosts: mock ? mockRepo.listPostsMock : prismaRepo.listPosts,
    getPostBySlug: mock ? mockRepo.getPostBySlugMock : prismaRepo.getPostBySlug,
    createPost: mock ? mockRepo.createPostMock : prismaRepo.createPost,
  };
}

/** P2-BE-2: swap implementations (tests or future DI). */
export function setCommunityPostRepository(impl: CommunityPostRepository | null) {
  _impl = impl;
}

export function getCommunityPostRepository(): CommunityPostRepository {
  if (!_impl) {
    _impl = defaultImpl();
  }
  return _impl;
}

export async function listPosts(params: ListPostsParams): Promise<Paginated<Post>> {
  return getCommunityPostRepository().listPosts(params);
}

export async function getPostBySlug(slug: string, options?: { viewerUserId?: string }): Promise<Post | null> {
  return getCommunityPostRepository().getPostBySlug(slug, options);
}

export async function createPost(input: {
  title: string;
  body: string;
  tags: string[];
  authorId: string;
}): Promise<Post> {
  return getCommunityPostRepository().createPost(input);
}
