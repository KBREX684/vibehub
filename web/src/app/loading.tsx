export default function Loading() {
  return (
    <div className="container py-16 space-y-6 animate-pulse">
      <div className="h-10 w-48 bg-[var(--color-bg-surface)] rounded-md border border-[var(--color-border)]" />
      <div className="space-y-3 max-w-2xl">
        <div className="h-4 w-full bg-[var(--color-bg-surface)] rounded border border-[var(--color-border)]" />
        <div className="h-4 w-5/6 bg-[var(--color-bg-surface)] rounded border border-[var(--color-border)]" />
        <div className="h-4 w-4/6 bg-[var(--color-bg-surface)] rounded border border-[var(--color-border)]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <div className="h-40 bg-[var(--color-bg-surface)] rounded-lg border border-[var(--color-border)]" />
        <div className="h-40 bg-[var(--color-bg-surface)] rounded-lg border border-[var(--color-border)]" />
      </div>
    </div>
  );
}
