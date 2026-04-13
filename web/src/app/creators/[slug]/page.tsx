import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getCreatorBySlug, listProjects } from "@/lib/repository";
import { ProjectCard } from "@/components/project-card";
import { User, Briefcase, Code2, Users } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CreatorDetailPage({ params }: Props) {
  const { slug } = await params;
  const creator = await getCreatorBySlug(slug);
  if (!creator) {
    notFound();
  }

  // Use the new creatorId filter for proper pagination
  const { items: creatorProjects } = await listProjects({ creatorId: creator.id, page: 1, limit: 20 });

  const prefMap: Record<string, string> = {
    open: "开放协作",
    invite_only: "仅限邀请",
    closed: "暂不协作",
  };

  return (
    <>
      <SiteHeader />
      <main className="container max-w-4xl py-12">
        <article className="bg-white border border-stone-200 rounded-3xl p-8 md:p-12 shadow-sm mb-12 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 opacity-60 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-2xl bg-amber-100 flex items-center justify-center shadow-inner shrink-0">
                <User className="w-10 h-10 text-amber-600" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 mb-2 tracking-tight">
                  {creator.slug}
                </h1>
                <p className="text-lg text-stone-500 font-medium">
                  {creator.headline}
                </p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-2xl p-6 mb-8 border border-stone-100">
              <p className="text-stone-700 leading-relaxed text-lg">
                {creator.bio}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">
                  <Code2 className="w-4 h-4 text-amber-600" /> 核心技能
                </h3>
                <div className="flex flex-wrap gap-2">
                  {creator.skills.map((skill) => (
                    <span key={skill} className="text-sm font-medium px-3 py-1.5 bg-white border border-stone-200 text-stone-700 rounded-lg shadow-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">
                  <Users className="w-4 h-4 text-amber-600" /> 协作偏好
                </h3>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-semibold">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  {prefMap[creator.collaborationPreference] || creator.collaborationPreference}
                </div>
              </div>
            </div>
          </div>
        </article>

        <section className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-8">
            <Briefcase className="w-6 h-6 text-stone-400" />
            <h2 className="text-2xl font-bold text-stone-900">
              代表作品
            </h2>
            <span className="text-sm font-medium px-3 py-1 bg-stone-100 text-stone-600 rounded-full">
              {creatorProjects.length}
            </span>
          </div>

          {creatorProjects.length === 0 ? (
            <div className="bg-stone-50 border border-dashed border-stone-200 rounded-3xl p-16 text-center">
              <p className="text-stone-500 text-lg">该创作者暂未发布任何项目。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {creatorProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
