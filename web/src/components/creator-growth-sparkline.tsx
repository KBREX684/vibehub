import type { CreatorGrowthStats } from "@/lib/types";

/** Relative bars from growth snapshot fields (not a time series — API is aggregate). */
export function CreatorGrowthMixChart({ stats }: { stats: CreatorGrowthStats }) {
  const values = [
    { label: "Posts", v: stats.postCount },
    { label: "Comments", v: stats.commentCount },
    { label: "Projects", v: stats.projectCount },
    { label: "Featured", v: stats.featuredPostCount },
    { label: "Intents", v: stats.collaborationIntentCount },
    { label: "Received", v: stats.receivedCommentCount },
  ];
  const max = Math.max(1, ...values.map((x) => x.v));

  return (
    <div className="space-y-2">
      <p className="text-[0.7rem] text-[var(--color-text-muted)] m-0">
        Activity mix from the latest growth snapshot (not a historical time series).
      </p>
      <div className="flex items-end gap-1.5 h-24">
        {values.map(({ label, v }) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div
              className="w-full max-w-[28px] mx-auto rounded-t-md bg-gradient-to-t from-[var(--color-primary)] to-[var(--color-accent-cyan)] opacity-90"
              style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
              title={`${label}: ${v}`}
            />
            <span className="text-[9px] font-medium text-[var(--color-text-muted)] truncate w-full text-center">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
