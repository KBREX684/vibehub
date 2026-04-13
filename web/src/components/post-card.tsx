import Link from "next/link";
import type { Post } from "@/lib/types";
import { MessageSquare, Clock, Star } from "lucide-react";

export function PostCard({
  post,
  truncateBody,
  detailHref,
}: {
  post: Post;
  truncateBody?: number;
  detailHref?: string;
}) {
  const body =
    truncateBody && post.body.length > truncateBody
      ? `${post.body.slice(0, truncateBody).trim()}…`
      : post.body;

  const date = new Date(post.createdAt).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });

  const CardContent = (
    <article 
      className="bg-white border border-stone-200 rounded-2xl p-6 h-full flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      id={post.slug}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 text-xs font-medium text-stone-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {date}
          </span>
        </div>
        {post.featuredAt && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-xs font-bold tracking-wide">
            <Star className="w-3 h-3 fill-amber-600" />
            精华
          </span>
        )}
      </div>
      
      <h3 className="text-xl font-bold text-stone-900 mb-3 leading-snug line-clamp-2">
        {post.title}
      </h3>
      
      <p className="text-stone-600 text-sm leading-relaxed flex-grow line-clamp-3 mb-5">
        {body}
      </p>
      
      <div className="flex flex-wrap items-center justify-between gap-3 mt-auto pt-4 border-t border-stone-100">
        <div className="flex flex-wrap gap-2">
          {post.tags.slice(0, 3).map((tag) => (
            <span 
              key={`${post.id}-${tag}`} 
              className="text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full"
            >
              #{tag}
            </span>
          ))}
          {post.tags.length > 3 && (
            <span className="text-xs font-medium px-2 py-1 text-stone-400">
              +{post.tags.length - 3}
            </span>
          )}
        </div>
        
        {/* Placeholder for comment count if we had it in the Post object, 
            but we can just show an icon for now */}
        <div className="flex items-center gap-1.5 text-stone-400">
          <MessageSquare className="w-4 h-4" />
        </div>
      </div>
      <div className="meta-row" style={{ marginTop: 8 }}>
        {post.authorName ? <span className="muted small">{post.authorName}</span> : null}
        <span className="muted small">
          {post.likeCount > 0 ? `❤ ${post.likeCount}` : null}
          {post.likeCount > 0 && post.bookmarkCount > 0 ? " · " : null}
          {post.bookmarkCount > 0 ? `🔖 ${post.bookmarkCount}` : null}
        </span>
      </div>
    </article>
  );

  if (detailHref) {
    return (
      <Link href={detailHref} className="block h-full group">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}
