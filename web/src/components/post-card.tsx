"use client";

import Link from "next/link";
import { MessageSquare, Heart, Bookmark, Star } from "lucide-react";
import type { Post } from "@/lib/types";

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

  const inner = (
    <article className="card group hover:-translate-y-0.5 transition-all duration-200 p-5">
      {/* Author row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--color-primary-subtle)] to-[var(--color-accent-cyan-subtle)] flex items-center justify-center text-xs font-semibold text-[var(--color-primary-hover)]">
            {post.authorName?.charAt(0)?.toUpperCase() ?? "A"}
          </span>
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {post.authorName ?? "Anonymous"}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">· {date}</span>
        </div>
        {post.featuredAt && (
          <span className="tag tag-yellow flex items-center gap-1">
            <Star className="w-2.5 h-2.5" />
            Featured
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1.5 line-clamp-2 leading-snug group-hover:text-[var(--color-primary-hover)] transition-colors">
        {post.title}
      </h3>

      {/* Excerpt */}
      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed mb-3">
        {body}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)]">
        <div className="tag-row">
          {post.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 z-20 relative">
          {post.likeCount > 0 && (
            <button className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--color-text-muted)] hover:text-[var(--color-warning)] hover:bg-[var(--color-warning-subtle)] transition-colors">
              <Heart className="w-3 h-3" />
              <span>{post.likeCount}</span>
            </button>
          )}
          {post.bookmarkCount > 0 && (
            <button className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-subtle)] transition-colors">
              <Bookmark className="w-3 h-3" />
              <span>{post.bookmarkCount}</span>
            </button>
          )}
          <button className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors">
            <MessageSquare className="w-3 h-3" />
          </button>
        </div>
      </div>
    </article>
  );

  const href = detailHref ?? `/discussions/${post.slug}`;
  return (
    <Link href={href} className="block outline-none">
      {inner}
    </Link>
  );
}
