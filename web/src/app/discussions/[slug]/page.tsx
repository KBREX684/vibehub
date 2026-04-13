import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, listCommentsForPost } from "@/lib/repository";
import { Clock, ArrowLeft, User, Sparkles } from "lucide-react";
import { CommentThread } from "@/components/comment-thread";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DiscussionDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { items: comments, pagination } = await listCommentsForPost({ postId: post.id, page: 1, limit: 50 });

  const date = new Date(post.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <main className="container max-w-4xl pb-24">
        <Link 
          href="/discussions" 
          className="inline-flex items-center gap-2 text-[0.95rem] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent-apple)] mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Discussions
        </Link>

        {/* Immersive Hero & Body */}
        <article className="relative w-full rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60 overflow-hidden mb-12">
          {/* Decorative Glow */}
          {post.featuredAt && (
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#f5ebd4] rounded-full blur-[80px] opacity-40 pointer-events-none" />
          )}
          
          <div className="relative z-10 p-8 md:p-16">
            <div className="flex flex-wrap gap-2 mb-8">
              {post.featuredAt && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f5ebd4]/40 text-[#d97706] text-xs font-bold uppercase tracking-wider rounded-[980px]">
                  <Sparkles className="w-3.5 h-3.5" /> Featured
                </span>
              )}
              {post.tags.map((tag) => (
                <span 
                  key={tag} 
                  className="text-xs font-medium px-3 py-1 bg-black/5 text-[var(--color-text-secondary)] rounded-[980px]"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.07] text-[var(--color-text-primary)] mb-8">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-[0.95rem] text-[var(--color-text-secondary)] mb-12 pb-8 border-b border-black/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[12px] bg-[#81e6d9]/20 flex items-center justify-center text-[#0d9488]">
                  <User className="w-4 h-4" />
                </div>
                <span className="font-semibold text-[var(--color-text-primary)]">{post.authorName || post.authorId}</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-black/10"></span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                {date}
              </span>
            </div>

            <div className="prose prose-stone max-w-none text-[1.05rem] text-[var(--color-text-secondary)] leading-[1.6] whitespace-pre-wrap">
              {post.body}
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <section id="comments" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-8 px-4">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">
              Comments
            </h2>
            <span className="text-[0.85rem] font-bold px-3 py-1 bg-black/5 text-[var(--color-text-secondary)] rounded-[980px]">
              {pagination.total}
            </span>
          </div>

          <CommentThread comments={comments} />
        </section>
      </main>
    </>
  );
}
