import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, listCommentsForPost } from "@/lib/repository";
import { Clock, ArrowLeft, Star, MessageSquare } from "lucide-react";
import { CommentThread } from "@/components/comment-thread";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DiscussionDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const { items: comments, pagination } = await listCommentsForPost({
    postId: post.id,
    page: 1,
    limit: 50,
  });

  const date = new Date(post.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="container max-w-4xl pb-24 pt-6">

      {/* Back */}
      <Link
        href="/discussions"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Discussions
      </Link>

      {/* Article */}
      <article className="card p-6 md:p-8 mb-8 relative overflow-hidden">
        {post.featuredAt && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-featured-subtle)] rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        )}

        <div className="relative z-10">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-5">
            {post.featuredAt && (
              <span className="tag tag-yellow flex items-center gap-1">
                <Star className="w-2.5 h-2.5" />
                Featured
              </span>
            )}
            {post.tags.map((tag) => (
              <span key={tag} className="tag">#{tag}</span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)] mb-5 leading-snug">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)] mb-8 pb-6 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-primary-subtle)] to-[var(--color-accent-cyan-subtle)] flex items-center justify-center text-xs font-semibold text-[var(--color-primary-hover)]">
                {post.authorName?.charAt(0)?.toUpperCase() ?? "A"}
              </span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {post.authorName ?? post.authorId}
              </span>
            </div>
            <span className="text-[var(--color-text-muted)]">·</span>
            <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <Clock className="w-3.5 h-3.5" />
              {date}
            </span>
          </div>

          {/* Body */}
          <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap max-w-none">
            {post.body}
          </div>
        </div>
      </article>

      {/* Comments */}
      <section id="comments" className="scroll-mt-20">
        <div className="flex items-center gap-2.5 mb-5">
          <MessageSquare className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Comments
          </h2>
          <span className="tag">{pagination.total}</span>
        </div>
        <CommentThread comments={comments} postSlug={post.slug} />
      </section>
    </main>
  );
}
