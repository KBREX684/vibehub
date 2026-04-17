import type { ApiKeyUsageDailyBucket } from "@/lib/types";

export function ApiKeyUsageSparkline({ daily, className = "h-10 w-full" }: { daily: ApiKeyUsageDailyBucket[]; className?: string }) {
  const values = daily.map((bucket) => bucket.count);
  const max = Math.max(1, ...values);
  const width = 160;
  const height = 40;
  const step = daily.length > 1 ? width / (daily.length - 1) : width;
  const points = daily
    .map((bucket, index) => {
      const x = Math.round(index * step * 100) / 100;
      const y = Math.round((height - (bucket.count / max) * (height - 6) - 3) * 100) / 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label="API key usage trend">
      <path d={`M 0 ${height - 2} H ${width}`} fill="none" stroke="var(--color-border-subtle)" strokeWidth="1" />
      <polyline
        fill="none"
        stroke="var(--color-accent-cyan)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {daily.map((bucket, index) => {
        const x = Math.round(index * step * 100) / 100;
        const y = Math.round((height - (bucket.count / max) * (height - 6) - 3) * 100) / 100;
        return <circle key={bucket.date} cx={x} cy={y} r="2" fill="var(--color-accent-cyan)" />;
      })}
    </svg>
  );
}
