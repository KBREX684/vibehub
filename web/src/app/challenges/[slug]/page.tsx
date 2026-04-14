import { notFound } from "next/navigation";
import Link from "next/link";
import { getChallengeBySlug } from "@/lib/repository";
import { ArrowLeft, Trophy, Flag, BookOpen, Clock } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ChallengeDetailPage({ params }: Props) {
  const { slug } = await params;
  const challenge = await getChallengeBySlug(slug);

  if (!challenge) {
    notFound();
  }

  const startDate = new Date(challenge.startDate).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  const endDate = new Date(challenge.endDate).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });

  const statusColors: Record<string, string> = {
    draft: "bg-stone-100 text-stone-600 border-stone-200",
    active: "bg-amber-100 text-amber-700 border-amber-200",
    closed: "bg-stone-200 text-stone-500 border-stone-300",
  };

  const statusLabels: Record<string, string> = {
    draft: "即将开始",
    active: "进行中",
    closed: "已结束",
  };

  const statusColor = statusColors[challenge.status] || statusColors.draft;
  const statusLabel = statusLabels[challenge.status] || "未知";

  return (
    <>
      <main className="container max-w-4xl py-12">
        <Link 
          href="/challenges" 
          className="inline-flex items-center gap-2 text-stone-500 hover:text-amber-600 font-medium mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回挑战赛列表
        </Link>

        <article className="bg-white border border-stone-200 rounded-3xl p-8 md:p-12 shadow-sm mb-12 relative overflow-hidden">
          {challenge.status === 'active' && (
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 opacity-60 pointer-events-none"></div>
          )}

          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-8 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shadow-inner shrink-0">
                  <Trophy className="w-6 h-6 text-amber-600" />
                </div>
                <span className={`text-sm font-bold uppercase tracking-wider px-4 py-1.5 rounded-xl border ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm font-medium text-stone-600 bg-stone-50 px-4 py-2 rounded-xl border border-stone-200">
                <Clock className="w-4 h-4 text-stone-400" />
                {startDate} <span className="text-stone-300 mx-1">至</span> {endDate}
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 mb-6 leading-tight tracking-tight">
              {challenge.title}
            </h1>

            <div className="flex flex-wrap gap-2 mb-10">
              {challenge.tags.map((tag) => (
                <span 
                  key={tag} 
                  className="text-sm font-medium px-3 py-1.5 bg-stone-50 border border-stone-200 text-stone-600 rounded-lg shadow-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className="space-y-12">
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Flag className="w-6 h-6 text-amber-600" />
                  <h2 className="text-2xl font-bold text-stone-900">活动简介</h2>
                </div>
                <div className="prose prose-stone max-w-none text-stone-700 leading-relaxed text-lg bg-stone-50 rounded-2xl p-6 border border-stone-100">
                  {challenge.description.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-4 last:mb-0">{paragraph}</p>
                  ))}
                </div>
              </section>

              {challenge.rules && (
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-stone-900">参与规则</h2>
                  </div>
                  <div className="prose prose-stone max-w-none text-stone-700 leading-relaxed text-lg bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
                    {challenge.rules.split('\n').map((rule, i) => (
                      <p key={i} className="mb-3 last:mb-0 flex items-start gap-3">
                        <span className="text-blue-500 font-bold mt-1">•</span>
                        <span>{rule.replace(/^\d+\.\s*/, '')}</span>
                      </p>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {challenge.status === 'active' && (
              <div className="mt-12 pt-8 border-t border-stone-100 text-center">
                <Link 
                  href="/projects/new" 
                  className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  提交项目参与挑战
                </Link>
                <p className="text-stone-500 text-sm mt-4">
                  在项目详情页中添加 <strong>#{challenge.tags[0]}</strong> 标签即可参与
                </p>
              </div>
            )}
          </div>
        </article>
      </main>
    </>
  );
}
