import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { listPosts } from "@/lib/repository";
import type { PostSortOrder } from "@/lib/types";
import {
  MessageSquare,
  Flame,
  Star,
  Clock,
  Plus,
} from "lucide-react";

interface Props {
  searchParams: Promise<{ sort?: string; page?: string }>;
}

export default async function DiscussionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const sort = (
    ["recent", "hot", "featured"].includes(params.sort || "")
      ? params.sort
      : "recent"
  ) as PostSortOrder;
  const page = parseInt(params.page || "1", 10) || 1;
  const { items, pagination } = await listPosts({ sort, page, limit: 12 });

  const TABS = [
    { sort: "recent",   icon: Clock,         label: "Recent"   },
    { sort: "hot",      icon: Flame,         label: "Hot"      },
    { sort: "featured", icon: Star,          label: "Featured" },
  ];

  return (
    <main className="container pb-24 space-y-8 pt-8">

      {/* Page header */}
      <section className="page-hero flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-accent-cyan-subtle)] flex items-center justify-center text-[var(--color-accent-cyan)]">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] mb-0.5">
              Discussions
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {pagination.total} active threads · Share knowledge, ask questions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort tabs */}
          <div className="inline-flex p-1 rounded-[var(--radius-pill)] bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
            {TABS.map(({ sort: s, icon: Icon, label }) => (
              <Link
                key={s}
                href={`/discussions?sort=${s}`}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-[var(--radius-pill)] transition-all ${
                  sort === s
                    ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </div>

          <Link
            href="/discussions/new"
            className="btn btn-primary text-sm px-4 py-1.5 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Discussion
          </Link>
        </div>
      </section>

      {/* Results */}
      {items.length === 0 ? (
        <div className="card p-16 text-center">
          <MessageSquare className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
            No discussions yet
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Be the first to start a conversation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              truncateBody={160}
              detailHref={`/discussions/${post.slug}`}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <nav className="flex justify-center gap-2 mt-8">
          {page > 1 && (
            <Link
              href={`/discussions?sort=${sort}&page=${page - 1}`}
              className="btn btn-secondary text-sm px-5 py-2"
            >
              Previous
            </Link>
          )}
          <span className="btn btn-ghost text-sm px-4 py-2 text-[var(--color-text-muted)]">
            {page} / {pagination.totalPages}
          </span>
          {page < pagination.totalPages && (
            <Link
              href={`/discussions?sort=${sort}&page=${page + 1}`}
              className="btn btn-secondary text-sm px-5 py-2"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
