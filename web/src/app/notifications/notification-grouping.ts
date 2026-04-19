import type { InAppNotification } from "@/lib/types";

export interface NotificationDisplayRow {
  /** Single id or multiple for a merged group */
  ids: string[];
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  kind: string;
  metadata?: Record<string, unknown>;
}

function postSlugFromMetadata(n: InAppNotification): string | null {
  const slug = n.metadata?.postSlug;
  return typeof slug === "string" && slug.length > 0 ? slug : null;
}

/** Merge consecutive-style buckets: all `post_liked` for the same post slug → one row. */
export function groupNotificationsForDisplay(items: InAppNotification[]): NotificationDisplayRow[] {
  const likeBuckets = new Map<string, InAppNotification[]>();
  const rest: InAppNotification[] = [];

  for (const n of items) {
    if (n.kind === "post_liked") {
      const slug = postSlugFromMetadata(n);
      if (slug) {
        const arr = likeBuckets.get(slug) ?? [];
        arr.push(n);
        likeBuckets.set(slug, arr);
        continue;
      }
    }
    rest.push(n);
  }

  const mergedLikes: NotificationDisplayRow[] = [];
  for (const [, arr] of likeBuckets) {
    const sorted = [...arr].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latest = sorted[0];
    const ids = sorted.map((x) => x.id);
    const unread = sorted.some((x) => !x.readAt);
    const readAt = unread
      ? undefined
      : sorted
          .map((x) => x.readAt)
          .filter(Boolean)
          .sort()
          .pop();
    const count = sorted.length;
    mergedLikes.push({
      ids,
      kind: "post_liked",
      metadata: latest.metadata,
      createdAt: latest.createdAt,
      readAt,
      title: count > 1 ? `${count} 人为你的帖子点了赞` : latest.title,
      body: count > 1 ? `你的帖子新增了 ${count} 个点赞。` : latest.body,
    });
  }

  mergedLikes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const singles: NotificationDisplayRow[] = rest.map((n) => ({
    ids: [n.id],
    kind: n.kind,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt,
    readAt: n.readAt,
    metadata: n.metadata,
  }));

  return [...mergedLikes, ...singles].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
