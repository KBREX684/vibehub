import { ChallengeCard } from "@/components/challenge-card";
import { listChallenges } from "@/lib/repository";
import { Trophy, Sparkles } from "lucide-react";

export default async function ChallengesPage() {
  const { items: challenges } = await listChallenges({ page: 1, limit: 20 });

  return (
    <>
      <main className="container pb-24">
        <section className="py-20 md:py-24 flex flex-col items-center text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-50/80 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-200 text-sm font-medium text-stone-600 mb-8 shadow-sm">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>VibeHub 官方挑战赛</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-stone-900 tracking-tight mb-6 max-w-3xl leading-[1.1]">
            参与挑战，展示你的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">VibeCoding</span> 实力
          </h1>
          
          <p className="text-xl text-stone-500 max-w-2xl leading-relaxed">
            定期举办的主题开发活动。结识同好，赢取社区荣誉，让你的项目被更多人看见。
          </p>
        </section>

        <section className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-10 pb-6 border-b border-stone-200">
            <Sparkles className="w-6 h-6 text-amber-600" />
            <h2 className="text-2xl font-bold text-stone-900">所有活动</h2>
            <span className="text-sm font-medium px-3 py-1 bg-stone-100 text-stone-600 rounded-full">
              {challenges.length}
            </span>
          </div>

          {challenges.length === 0 ? (
            <div className="bg-white border border-dashed border-stone-200 rounded-3xl p-16 text-center">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-6 h-6 text-stone-400" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">暂无活动</h3>
              <p className="text-stone-500 max-w-md mx-auto">
                目前还没有发布任何挑战赛活动，敬请期待。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {challenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
