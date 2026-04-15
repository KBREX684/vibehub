import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/post-card";
import { ProjectCard } from "@/components/project-card";
import { getTopicDiscovery } from "@/lib/repository";
import { Layers, MessageSquare, FolderGit2 } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CollectionTopicPage({ params }: PageProps) {
  const { slug } = await params;
  const discovery = await getTopicDiscovery(slug);

  if (!discovery) {
    notFound();
  }

  const { topic, posts, projects } = discovery;

  return (
    <main className="container pb-24">
      <div className="py-10 border-b border-[var(--color-border)] mb-10">
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          <Link href="/collections" className="inline-link">专题集合</Link>
          {" "}/ {topic.title}
        </p>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-accent-cyan-subtle)] flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-[var(--color-accent-cyan)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] m-0">{topic.title}</h1>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] mb-3">{topic.description}</p>
        <span className="tag">#{topic.tag}</span>
      </div>

      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] m-0">讨论</h2>
        </div>
        {posts.items.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">该标签下暂无已通过审核的讨论帖。</p>
        ) : (
          <div className="space-y-4">
            {posts.items.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                truncateBody={220}
                detailHref={`/discussions#${post.slug}`}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <FolderGit2 className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] m-0">项目</h2>
        </div>
        {projects.items.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">该标签下暂无项目。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.items.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
