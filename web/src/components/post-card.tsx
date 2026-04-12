import type { Post } from "@/lib/types";

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="card">
      <h3>{post.title}</h3>
      <p>{post.body}</p>
      <div className="tag-row">
        {post.tags.map((tag) => (
          <span key={`${post.id}-${tag}`} className="tag">
            #{tag}
          </span>
        ))}
      </div>
    </article>
  );
}
