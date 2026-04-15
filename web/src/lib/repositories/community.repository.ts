/**
 * P2-BE-1 / P2-BE-2: Community (post) data access — facade re-export.
 * Implementation: `community/community-post-repository.ts` (mock vs Prisma via factory).
 */
export {
  listPosts,
  getPostBySlug,
  createPost,
  getCommunityPostRepository,
  setCommunityPostRepository,
  type CommunityPostRepository,
} from "./community/community-post-repository";
