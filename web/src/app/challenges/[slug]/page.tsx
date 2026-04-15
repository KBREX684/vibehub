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

  const startDate = new Date(challenge.startDate).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const endDate = new Date(challenge.endDate).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const statusConfig: Record<string, { label: string; cls: string }> = {
    draft:  { label: "即将开始", cls: "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)]" },
    active: { label: "进行中",   cls: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[rgba(251,191,36,0.25)]" },
    closed: { label: "已结束",   cls: "bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]" },
  };

  const { label: statusLabel, cls: statusCls } =
    statusConfig[challenge.status] ?? statusConfig.draft;

  return (
    <main className="container max-w-4xl py-12">
      <Link
        href="/challenges"
        className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回挑战赛列表
      </Link>

      <article className="card p-8 md:p-12 mb-12 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-8 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-warning-subtle)] flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-[var(--color-warning)]" />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-[var(--radius-pill)] border ${statusCls}`}>
              {statusLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-elevated)] px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)]">
            <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
            {startDate} — {endDate}
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--color-text-primary)] mb-6 leading-tight tracking-tight">
          {challenge.title}
        </h1>

        <div className="flex flex-wrap gap-2 mb-10">
          {challenge.tags.map((tag) => (
            <span key={tag} className="tag">#{tag}</span>
          ))}
        </div>

        <div className="space-y-10">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flag className="w-5 h-5 text-[var(--color-warning)]" />
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] m-0">活动简介</h2>
            </div>
            <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3">
              {challenge.description.split("\n").map((paragraph, i) => (
                <p key={i} className="m-0">{paragraph}</p>
              ))}
            </div>
          </section>

          {challenge.rules && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-[var(--color-accent-apple)]" />
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] m-0">参与规则</h2>
              </div>
              <div className="bg-[var(--color-accent-apple-subtle)] border border-[rgba(0,113,227,0.2)] rounded-[var(--radius-lg)] p-6 text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-3">
                {challenge.rules.split("\n").map((rule, i) => (
                  <p key={i} className="m-0 flex items-start gap-3">
                    <span className="text-[var(--color-accent-apple)] font-bold mt-0.5">•</span>
                    <span>{rule.replace(/^\d+\.\s*/, "")}</span>
                  </p>
                ))}
              </div>
            </section>
          )}
        </div>

        {challenge.status === "active" && (
          <div className="mt-12 pt-8 border-t border-[var(--color-border)] text-center">
            <Link
              href="/projects/new"
              className="inline-flex items-center justify-center gap-2 bg-[var(--color-warning)] hover:bg-[#f59e0b] text-black px-8 py-3.5 rounded-[var(--radius-xl)] font-bold text-base transition-all"
            >
              提交项目参与挑战
            </Link>
            <p className="text-[var(--color-text-muted)] text-sm mt-4">
              在项目详情页中添加{" "}
              <span className="tag">#{challenge.tags[0]}</span>{" "}
              标签即可参与
            </p>
          </div>
        )}
      </article>
    </main>
  );
}
