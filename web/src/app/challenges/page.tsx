import { ChallengeCard } from "@/components/challenge-card";
import { listChallenges } from "@/lib/repository";
import { Trophy, Sparkles } from "lucide-react";

export default async function ChallengesPage() {
  const { items: challenges } = await listChallenges({ page: 1, limit: 20 });

  return (
    <main className="container pb-24">
      <section className="py-16 md:py-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-pill)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] mb-8">
          <Trophy className="w-4 h-4 text-[var(--color-warning)]" />
          <span>VibeHub 官方挑战赛</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--color-text-primary)] tracking-tight mb-6 max-w-3xl leading-[1.1]">
          参与挑战，展示你的 VibeCoding 实力
        </h1>

        <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl leading-relaxed">
          定期举办的主题开发活动。结识同好，赢取社区荣誉，让你的项目被更多人看见。
        </p>
      </section>

      <section className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8 pb-5 border-b border-[var(--color-border)]">
          <Sparkles className="w-5 h-5 text-[var(--color-warning)]" />
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] m-0">所有活动</h2>
          <span className="tag-row">
            <span className="tag">{challenges.length}</span>
          </span>
        </div>

        {challenges.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--color-bg-elevated)] flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-6 h-6 text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-2">暂无活动</h3>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto m-0">
              目前还没有发布任何挑战赛活动，敬请期待。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
