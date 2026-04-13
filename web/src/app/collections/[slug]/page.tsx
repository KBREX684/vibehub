import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/post-card";
import { ProjectCard } from "@/components/project-card";
import { getTopicDiscovery } from "@/lib/repository";

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
    <>
      <main className="container section">
        <p className="muted">
          <Link href="/collections" className="inline-link">
            专题集合
          </Link>
        </p>
        <h1>{topic.title}</h1>
        <p className="muted">{topic.description}</p>
        <p>
          标签 <span className="tag">#{topic.tag}</span>
        </p>

        <section className="section">
          <h2>讨论</h2>
          {posts.items.length === 0 ? (
            <p className="muted">该标签下暂无已通过审核的讨论帖。</p>
          ) : (
            <div className="grid">
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

        <section className="section">
          <h2>项目</h2>
          {projects.items.length === 0 ? (
            <p className="muted">该标签下暂无项目。</p>
          ) : (
            <div className="grid">
              {projects.items.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
