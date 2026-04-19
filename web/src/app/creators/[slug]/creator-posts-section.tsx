import Link from "next/link";
import { MessageSquare, ArrowRight } from "lucide-react";
import { getServerTranslator } from "@/lib/i18n";
import { listPosts } from "@/lib/repository";
import { PostCard } from "@/components/post-card";

interface Props {
  authorUserId: string;
}

export async function CreatorPostsSection({ authorUserId }: Props) {
  const { t } = await getServerTranslator();
  const { items } = await listPosts({ authorId: authorUserId, page: 1, limit: 8 });

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="pt-8">
      <div className="flex items-center justify-between gap-3 mb-6 px-1">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-[var(--color-text-tertiary)]" />
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">{t("creator.posts_title")}</h2>
        </div>
        <Link
          href="/discover"
          className="text-xs font-medium text-[var(--color-primary-hover)] hover:underline inline-flex items-center gap-1"
        >
          {t("creator.posts_view")}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-3 max-w-3xl">
        {items.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
