import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PostCard } from "@/components/post-card";
import { listPosts } from "@/lib/repository";
import type { PostSortOrder } from "@/lib/repository";

interface Props {
  searchParams: Promise<{ sort?: string; page?: string }>;
}

export default async function DiscussionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const sort = (params.sort === "hot" ? "hot" : "recent") as PostSortOrder;
  const page = parseInt(params.page || "1", 10) || 1;
  const { items, pagination } = await listPosts({ sort, page, limit: 12 });

  return (
    <>
      <SiteHeader />
      <main className="container section">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 mb-2">讨论广场</h1>
            <p className="text-stone-500">
              发现灵感、交流经验。共 {pagination.total} 篇讨论。
            </p>
          </div>
          <div className="flex bg-stone-100 p-1 rounded-lg border border-stone-200">
            <Link 
              href="/discussions?sort=recent" 
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${sort === 'recent' ? 'bg-white text-amber-600 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
            >
              最新
            </Link>
            <Link 
              href="/discussions?sort=hot" 
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${sort === 'hot' ? 'bg-white text-amber-600 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
            >
              最热
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((post) => (
            <PostCard key={post.id} post={post} truncateBody={140} detailHref={`/discussions/${post.slug}`} />
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-stone-200">
            <p className="text-stone-500">暂无讨论内容</p>
          </div>
        )}
      </main>
    </>
  );
}
