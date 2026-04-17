"use client";

import Link from "next/link";
import { MessageSquare, Heart, Bookmark, Star } from "lucide-react";
import type { Post } from "@/lib/types";
import { Avatar, Badge, SpotlightCard } from "@/components/ui";

type MetricTone = "default" | "warning" | "primary";

/**
 * Small shared helper so each metric (like / bookmark / comment) is one
 * call site instead of a 10+ token className copy-paste. Still uses
 * design-system tokens; no new colors.
 */
function MetricButton({
  tone,
  value,
  icon,
  onlyIcon = false,
  ariaLabel,
}: {
  tone: MetricTone;
  value?: number;
  icon: React.ReactNode;
  onlyIcon?: boolean;
  ariaLabel?: string;
}) {
  const toneClass =
    tone === "warning"
      ? "hover:text-[var(--color-warning)] hover:bg-[var(--color-warning-subtle)]"
      : tone === "primary"
        ? "hover:text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-subtle)]"
        : "hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]";
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-xs text-[var(--color-text-muted)] transition-colors ${toneClass}`}
    >
      {icon}
      {!onlyIcon && value !== undefined ? <span>{value}</span> : null}
    </button>
  );
}

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
    <SpotlightCard className="card group transition-colors p-5" spotlightRadius={180}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Avatar
            tone="neutral"
            size="sm"
            initial={post.authorName?.charAt(0) || "A"}
            alt={post.authorName ?? "Author"}
          />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {post.authorName ?? "Anonymous"}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">· {date}</span>
        </div>
        {post.featuredAt ? (
          <Badge variant="warning" pill>
            <Star className="w-2.5 h-2.5" aria-hidden="true" />
            Featured
          </Badge>
        ) : null}
      </div>

      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1.5 line-clamp-2 leading-snug group-hover:underline transition-colors">
        {post.title}
      </h3>

      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed mb-3">
        {body}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)]">
        <div className="tag-row">
          {post.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 relative z-20">
          {post.likeCount > 0 ? (
            <MetricButton
              tone="warning"
              value={post.likeCount}
              icon={<Heart className="w-3 h-3" aria-hidden="true" />}
              ariaLabel={`${post.likeCount} likes`}
            />
          ) : null}
          {post.bookmarkCount > 0 ? (
            <MetricButton
              tone="primary"
              value={post.bookmarkCount}
              icon={<Bookmark className="w-3 h-3" aria-hidden="true" />}
              ariaLabel={`${post.bookmarkCount} bookmarks`}
            />
          ) : null}
          <MetricButton
            tone="default"
            onlyIcon
            icon={<MessageSquare className="w-3 h-3" aria-hidden="true" />}
            ariaLabel="Open discussion"
          />
        </div>
      </div>
    </SpotlightCard>
  );

  const href = detailHref ?? `/discussions/${post.slug}`;
  return (
    <Link href={href} className="block outline-none">
      {inner}
    </Link>
  );
}
