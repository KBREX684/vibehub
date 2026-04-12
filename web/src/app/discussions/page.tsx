import { SiteHeader } from "@/components/site-header";
import { PostCard } from "@/components/post-card";
import { listPosts } from "@/lib/repository";

export default async function DiscussionsPage() {
  const { items, pagination } = await listPosts({ page: 1, limit: 12 });

  return (
    <>
      <SiteHeader />
      <main className="container section">
        <h1>讨论广场</h1>
        <p className="muted">
          当前展示 {items.length} 条内容（总数 {pagination.total}），支持后续接入专题、榜单与审核后台。
        </p>
        <div className="grid">
          {items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </main>
    </>
  );
}
