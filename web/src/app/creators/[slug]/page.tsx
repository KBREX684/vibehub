import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getCreatorBySlug, listProjects } from "@/lib/repository";
import { ProjectCard } from "@/components/project-card";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CreatorDetailPage({ params }: Props) {
  const { slug } = await params;
  const creator = await getCreatorBySlug(slug);
  if (!creator) {
    notFound();
  }

  const { items: projects } = await listProjects({ page: 1, limit: 20 });
  const creatorProjects = projects.filter((project) => project.creatorId === creator.id);

  return (
    <>
      <SiteHeader />
      <main className="container section">
        <article className="card">
          <h1>{creator.slug}</h1>
          <p className="muted">{creator.headline}</p>
          <p>{creator.bio}</p>
          <div className="tag-row">
            {creator.skills.map((skill) => (
              <span key={skill} className="tag">
                {skill}
              </span>
            ))}
          </div>
          <p>
            协作偏好：<strong>{creator.collaborationPreference}</strong>
          </p>
        </article>

        <section className="section">
          <h2>该创作者的项目</h2>
          <div className="grid">
            {creatorProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
