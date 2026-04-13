import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { CollaborationIntentForm } from "@/components/collaboration-intent-form";
import { ProjectTeamLinkForm } from "@/components/project-team-link-form";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getCreatorProfileById, getProjectBySlug, listProjectCollaborationIntents } from "@/lib/repository";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const mcpToolExample = {
    tool: "get_project_detail",
    input: { slug: project.slug },
  };

  const approvedIntents = await listProjectCollaborationIntents({
    projectId: project.id,
    status: "approved",
    page: 1,
    limit: 8,
  });

  const session = await getSessionUserFromCookie();
  const creatorProfile = await getCreatorProfileById(project.creatorId);
  const canLinkTeam = Boolean(session && creatorProfile && session.userId === creatorProfile.userId);

  return (
    <>
      <SiteHeader />
      <main className="container detail">
        <article className="card">
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            {project.logoUrl ? (
              <img
                src={project.logoUrl}
                alt={`${project.title} logo`}
                style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
              />
            ) : null}
            <div>
              <h1 style={{ margin: 0 }}>{project.title}</h1>
              <p className="muted" style={{ margin: "4px 0 0" }}>{project.oneLiner}</p>
            </div>
          </div>

          {project.screenshots && project.screenshots.length > 0 ? (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "12px 0" }}>
              {project.screenshots.map((url, i) => (
                <img
                  key={`screenshot-${i}`}
                  src={url}
                  alt={`Screenshot ${i + 1}`}
                  style={{ maxHeight: 200, borderRadius: 8, border: "1px solid var(--line)" }}
                />
              ))}
            </div>
          ) : null}

          <p>{project.description}</p>
          <div className="tag-row">
            {project.techStack.map((tech) => (
              <span key={`${project.id}-${tech}`} className="tag">
                {tech}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: 12 }}>
            {project.demoUrl ? (
              <a href={project.demoUrl} target="_blank" rel="noreferrer" className="button ghost">
                Live Demo
              </a>
            ) : null}
            {project.repoUrl ? (
              <a href={project.repoUrl} target="_blank" rel="noreferrer" className="button ghost">
                Repository
              </a>
            ) : null}
            {project.websiteUrl ? (
              <a href={project.websiteUrl} target="_blank" rel="noreferrer" className="button ghost">
                Website
              </a>
            ) : null}
          </div>

          {(project.openSource || project.license) ? (
            <div className="tag-row" style={{ marginTop: 8 }}>
              {project.openSource ? <span className="tag">Open Source</span> : null}
              {project.license ? <span className="tag">{project.license}</span> : null}
            </div>
          ) : null}
        </article>

        <ProjectTeamLinkForm project={project} canEdit={canLinkTeam} />

        <aside className="card">
          <h3>Agent Invocation Example</h3>
          <pre className="code">{JSON.stringify(mcpToolExample, null, 2)}</pre>
          <p className="muted">
            Endpoint: <code>/api/v1/mcp/get_project_detail?slug={project.slug}</code>
          </p>
          <Link href="/" className="inline-link">
            Back to homepage
          </Link>
        </aside>

        <section className="card detail-full">
          <h3>Collaboration Square</h3>
          <p className="muted">
            Submit your intent to collaborate on this project. Choose join/recruit and provide context.
          </p>
          <CollaborationIntentForm projectSlug={project.slug} />
        </section>

        <section className="card detail-full">
          <h3>Approved Collaboration Intents</h3>
          <p className="muted">Showing {approvedIntents.items.length} approved submissions.</p>
          {approvedIntents.items.length === 0 ? (
            <p className="muted">No approved intents yet.</p>
          ) : (
            <div className="admin-list">
              {approvedIntents.items.map((intent) => (
                <article key={intent.id} className="card">
                  <div className="meta-row">
                    <strong>{intent.intentType === "join" ? "Join Request" : "Recruitment Notice"}</strong>
                    <span className={`status status-${intent.status}`}>{intent.status}</span>
                  </div>
                  <p>{intent.message}</p>
                  <p className="muted">Applicant: {intent.applicantId}</p>
                  {intent.contact ? <p className="muted">Contact: {intent.contact}</p> : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}