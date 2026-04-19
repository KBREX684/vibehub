"use client";

import Link from "next/link";
import { MessageSquare, Heart, Bookmark, Star } from "lucide-react";
import type { Post } from "@/lib/types";
import { useLanguage } from "@/app/context/LanguageContext";
import { formatLocalizedDate } from "@/lib/formatting";
import { Avatar, Badge, SpotlightCard } from "@/components/ui";

type MetricTone = "default" | "warning" | "primary";

/**
 * Small shared helper so each metric (like / bookmark / comment) is one
 * call site instead of a 10+ token className copy-paste. Still uses
 * design-system tokens; no new colors.
 */
function MetricPill({
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
    <span
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-xs text-[var(--color-text-muted)] transition-colors ${toneClass}`}
    >
      {icon}
      {!onlyIcon && value !== undefined ? <span>{value}</span> : null}
    </span>
  );
}

export function PostCard({
  post,
  detailHref,
}: {
  post: Post;
  detailHref?: string;
}) {
  const { language, t } = useLanguage();
  const date = formatLocalizedDate(post.createdAt, language, { month: "short", day: "numeric" });

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
          <Badge variant="warning" pill mono size="sm">
            <Star className="w-2.5 h-2.5" aria-hidden="true" />
            {t("post.featured", "Featured")}
          </Badge>
        ) : null}
      </div>

      <h3 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)] mb-1.5 line-clamp-2 leading-snug group-hover:underline transition-colors">
        {post.title}
      </h3>

      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed mb-3">
        {post.body}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)]">
        <div className="flex flex-wrap items-center gap-2">
          {post.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="default" pill mono size="sm">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1 relative z-20">
          {post.likeCount > 0 ? (
            <MetricPill
              tone="warning"
              value={post.likeCount}
              icon={<Heart className="w-3 h-3" aria-hidden="true" />}
              ariaLabel={t("post.likes_count", "{count} likes").replace("{count}", String(post.likeCount))}
            />
          ) : null}
          {post.bookmarkCount > 0 ? (
            <MetricPill
              tone="primary"
              value={post.bookmarkCount}
              icon={<Bookmark className="w-3 h-3" aria-hidden="true" />}
              ariaLabel={t("post.bookmarks_count", "{count} bookmarks").replace("{count}", String(post.bookmarkCount))}
            />
          ) : null}
          <MetricPill
            tone="default"
            onlyIcon
            icon={<MessageSquare className="w-3 h-3" aria-hidden="true" />}
            ariaLabel={t("notifications.open_post", "Open post")}
          />
        </div>
      </div>
    </SpotlightCard>
  );

  const href = detailHref ?? "/discover";
  return (
    <Link href={href} className="block outline-none">
      {inner}
    </Link>
  );
}
