import Link from "next/link";
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
          当前展示 {items.length} 条内容（总数 {pagination.total}）。专题入口见{" "}
          <Link href="/collections" className="inline-link">
            专题集合
          </Link>
          ，热度榜见{" "}
          <Link href="/leaderboards" className="inline-link">
            榜单
          </Link>
          。
        </p>
        <div className="grid">
          {items.map((post) => (
            <PostCard key={post.id} post={post} truncateBody={280} detailHref={`/discussions#${post.slug}`} />
          ))}
        </div>
      </main>
    </>
  );
}
