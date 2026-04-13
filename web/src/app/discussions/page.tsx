import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PostCard } from "@/components/post-card";
import { listPosts } from "@/lib/repository";
import type { PostSortOrder } from "@/lib/types";
import { MessageSquare, Flame, Sparkles, Clock } from "lucide-react";

interface Props {
  searchParams: Promise<{ sort?: string; page?: string }>;
}

export default async function DiscussionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const sort = (["recent", "hot", "featured"].includes(params.sort || "") ? params.sort : "recent") as PostSortOrder;
  const page = parseInt(params.page || "1", 10) || 1;
  const { items, pagination } = await listPosts({ sort, page, limit: 12 });

  return (
    <>
      <SiteHeader />
      <main className="container pb-24 space-y-8">
        
        {/* Header Bento */}
        <section className="p-8 md:p-12 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60 flex flex-col md:flex-row md:items-center justify-between gap-8 mt-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-black/5 flex items-center justify-center text-[var(--color-text-primary)] shadow-sm">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] m-0">
                Discussions
              </h1>
              <p className="text-[1.05rem] text-[var(--color-text-secondary)] mt-1">
                Discover ideas, share knowledge. {pagination.total} active threads.
              </p>
            </div>
          </div>

          {/* Glass Pill Filter */}
          <div className="inline-flex p-1.5 rounded-[980px] bg-black/5 border border-black/5 backdrop-blur-md self-start md:self-auto">
            <Link 
              href="/discussions?sort=recent" 
              className={`flex items-center gap-2 px-5 py-2.5 text-[0.95rem] font-medium rounded-[980px] transition-all duration-300 ${sort === 'recent' ? 'bg-white text-[var(--color-text-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/50'}`}
            >
              <Clock className="w-4 h-4" /> Recent
            </Link>
            <Link 
              href="/discussions?sort=hot" 
              className={`flex items-center gap-2 px-5 py-2.5 text-[0.95rem] font-medium rounded-[980px] transition-all duration-300 ${sort === 'hot' ? 'bg-white text-[var(--color-text-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/50'}`}
            >
              <Flame className="w-4 h-4" /> Hot
            </Link>
            <Link 
              href="/discussions?sort=featured" 
              className={`flex items-center gap-2 px-5 py-2.5 text-[0.95rem] font-medium rounded-[980px] transition-all duration-300 ${sort === 'featured' ? 'bg-white text-[var(--color-text-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/50'}`}
            >
              <Sparkles className="w-4 h-4" /> Featured
            </Link>
          </div>
        </section>

        {/* Masonry-like Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((post) => (
            <PostCard key={post.id} post={post} truncateBody={140} detailHref={`/discussions/${post.slug}`} />
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-24 rounded-[32px] bg-[rgba(255,255,255,0.5)] border border-white/60 shadow-sm">
            <MessageSquare className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-4 opacity-50" />
            <p className="text-[1.05rem] font-medium text-[var(--color-text-secondary)]">No discussions found.</p>
          </div>
        )}
      </main>
    </>
  );
}
