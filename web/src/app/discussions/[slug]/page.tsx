import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getPostBySlug, listCommentsForPost } from "@/lib/repository";
import { Clock, ArrowLeft, User } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DiscussionDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { items: comments, pagination } = await listCommentsForPost({
    postId: post.id,
    page: 1,
    limit: 50,
  });

  const date = new Date(post.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <SiteHeader />
      <main className="container max-w-3xl py-12">
        <Link 
          href="/discussions" 
          className="inline-flex items-center gap-2 text-stone-500 hover:text-amber-600 font-medium mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回讨论广场
        </Link>

        <article className="bg-white border border-stone-200 rounded-3xl p-8 md:p-12 shadow-sm mb-12">
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag) => (
              <span 
                key={tag} 
                className="text-xs font-medium px-3 py-1 bg-amber-50 text-amber-700 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 mb-6 leading-tight tracking-tight">
            {post.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-stone-500 mb-10 pb-8 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                <User className="w-4 h-4 text-stone-400" />
              </div>
              <span className="font-medium text-stone-700">{post.authorId}</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-stone-300"></span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {date}
            </span>
          </div>

          <div className="prose prose-stone max-w-none text-stone-700 leading-relaxed text-lg">
            {post.body.split('\n').map((paragraph, i) => (
              <p key={i} className="mb-4">{paragraph}</p>
            ))}
          </div>
        </article>

        <section id="comments" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-stone-900 mb-8 flex items-center gap-3">
            评论 
            <span className="text-sm font-medium px-3 py-1 bg-stone-100 text-stone-600 rounded-full">
              {pagination.total}
            </span>
          </h2>

          {comments.length === 0 ? (
            <div className="bg-stone-50 border border-dashed border-stone-200 rounded-2xl p-12 text-center">
              <p className="text-stone-500">还没有人评论，快来抢沙发吧！</p>
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="font-bold text-stone-900">{comment.authorId}</span>
                    </div>
                    <span className="text-xs text-stone-400">
                      {new Date(comment.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <div className="text-stone-700 leading-relaxed pl-11">
                    {comment.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
