import Link from "next/link";
import type { Challenge } from "@/lib/types";
import { Calendar, Users, Trophy } from "lucide-react";

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const statusColors: Record<string, string> = {
    draft: "bg-stone-100 text-stone-600",
    active: "bg-amber-100 text-amber-700",
    closed: "bg-stone-200 text-stone-500",
  };

  const statusLabels: Record<string, string> = {
    draft: "即将开始",
    active: "进行中",
    closed: "已结束",
  };

  const statusColor = statusColors[challenge.status] || statusColors.draft;
  const statusLabel = statusLabels[challenge.status] || "未知";

  const startDate = new Date(challenge.startDate).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  const endDate = new Date(challenge.endDate).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });

  return (
    <article className="bg-white border border-stone-200 rounded-3xl p-6 md:p-8 flex flex-col h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
      {/* Decorative background element */}
      {challenge.status === 'active' && (
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-50 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-5">
          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg ${statusColor}`}>
            {statusLabel}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-stone-500 font-medium bg-stone-50 px-2.5 py-1 rounded-md border border-stone-100">
            <Calendar className="w-3.5 h-3.5" />
            {startDate} - {endDate}
          </span>
        </div>

        <h3 className="text-2xl font-extrabold text-stone-900 mb-3 leading-tight group-hover:text-amber-600 transition-colors">
          <Link href={`/challenges/${challenge.slug}`} className="before:absolute before:inset-0">
            {challenge.title}
          </Link>
        </h3>

        <p className="text-stone-600 text-base leading-relaxed mb-6 line-clamp-3">
          {challenge.description}
        </p>

        <div className="mt-auto pt-5 border-t border-stone-100 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {challenge.tags.map((tag) => (
              <span key={`${challenge.id}-${tag}`} className="text-xs font-medium px-2.5 py-1 bg-stone-50 text-stone-600 rounded-md border border-stone-100">
                #{tag}
              </span>
            ))}
          </div>
          
          <div className="flex items-center text-amber-600 text-sm font-semibold group-hover:gap-2 transition-all">
            查看活动详情 <Trophy className="w-4 h-4 ml-1" />
          </div>
        </div>
      </div>
    </article>
  );
}
