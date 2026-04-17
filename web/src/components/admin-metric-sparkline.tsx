export function AdminMetricSparkline({ values, className = "h-12 w-full" }: { values: number[]; className?: string }) {
  const safeValues = values.length > 0 ? values : [0];
  const max = Math.max(1, ...safeValues);
  const width = 160;
  const height = 48;
  const step = safeValues.length > 1 ? width / (safeValues.length - 1) : width;
  const points = safeValues
    .map((value, index) => {
      const x = Math.round(index * step * 100) / 100;
      const y = Math.round((height - (value / max) * (height - 10) - 5) * 100) / 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label="Metric trend">
      <path d={`M 0 ${height - 2} H ${width}`} fill="none" stroke="var(--color-border-subtle)" strokeWidth="1" />
      <polyline
        fill="none"
        stroke="var(--color-accent-cyan)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {safeValues.map((value, index) => {
        const x = Math.round(index * step * 100) / 100;
        const y = Math.round((height - (value / max) * (height - 10) - 5) * 100) / 100;
        return <circle key={`${index}-${value}`} cx={x} cy={y} r="2" fill="var(--color-accent-cyan)" />;
      })}
    </svg>
  );
}
