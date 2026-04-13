"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Post } from "@/lib/types";
import { MessageSquare, Heart, Bookmark } from "lucide-react";

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

  const date = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const CardContent = (
    <motion.article 
      id={post.slug}
      className="relative flex flex-col h-full bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] rounded-[24px] p-6 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] cursor-pointer"
      whileHover={{ y: -2, scale: 1.01, boxShadow: "0 12px 40px -8px rgba(0,0,0,0.06)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {post.authorName && (
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              {post.authorName}
            </span>
          )}
          <span className="text-xs font-medium text-[var(--color-text-tertiary)]">
            • {date}
          </span>
        </div>
        {post.featuredAt && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[980px] bg-[#f5ebd4]/10 text-[#f5ebd4] text-[10px] font-bold uppercase tracking-wider">
            Featured
          </span>
        )}
      </div>
      
      <h3 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-2 leading-[1.2] line-clamp-2">
        {post.title}
      </h3>
      
      <p className="text-[0.95rem] text-[var(--color-text-secondary)] leading-[1.47] flex-grow line-clamp-3 mb-5">
        {body}
      </p>
      
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-black/5">
        <div className="flex flex-wrap gap-1.5">
          {post.tags.slice(0, 3).map((tag) => (
            <span 
              key={`${post.id}-${tag}`} 
              className="text-[11px] font-medium px-2.5 py-1 bg-black/5 text-[var(--color-text-secondary)] rounded-[980px]"
            >
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex items-center gap-1 relative z-20">
          {post.likeCount > 0 && (
            <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[#f5ebd4] hover:bg-[#f5ebd4]/10 transition-colors">
              <Heart className="w-4 h-4" />
              <span className="text-xs font-medium">{post.likeCount}</span>
            </button>
          )}
          {post.bookmarkCount > 0 && (
            <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-apple)] hover:bg-[var(--color-accent-apple)]/10 transition-colors">
              <Bookmark className="w-4 h-4" />
              <span className="text-xs font-medium">{post.bookmarkCount}</span>
            </button>
          )}
          <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 transition-colors">
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.article>
  );

  if (detailHref) {
    return (
      <Link href={detailHref} className="block h-full outline-none">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}
