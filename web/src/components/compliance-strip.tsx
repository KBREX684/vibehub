interface ComplianceItem {
  label: string;
  value: string;
}

export function ComplianceStrip({ items }: { items: ComplianceItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] hide-scrollbar">
      <div className="flex min-w-max items-center gap-0 px-4 py-2">
        <span className="mr-3 inline-flex h-2 w-2 shrink-0 rounded-full bg-[var(--color-success)]" />
        {items.map((item, index) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
              {item.label}
            </span>
            <span className="text-xs text-[var(--color-text-primary)]">{item.value}</span>
            {index < items.length - 1 ? (
              <span className="h-3 w-px bg-[var(--color-border)]" aria-hidden="true" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
