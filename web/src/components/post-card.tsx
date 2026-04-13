import Link from "next/link";
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

  return (
    <article className="card" id={post.slug}>
      {detailHref ? (
        <h3>
          <Link href={detailHref} className="inline-link">
            {post.title}
          </Link>
        </h3>
      ) : (
        <h3>{post.title}</h3>
      )}
      <p>{body}</p>
      <div className="tag-row">
        {post.tags.map((tag) => (
          <span key={`${post.id}-${tag}`} className="tag">
            #{tag}
          </span>
        ))}
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
}
