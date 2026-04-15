import Link from "next/link";

export default function TeamNotFound() {
  return (
    <div className="container py-20 text-center max-w-lg mx-auto">
      <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Team</p>
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-3">Team not found</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-8">
        This team doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link href="/teams" className="btn btn-primary px-6 py-2.5 text-sm font-semibold inline-block">
        View teams
      </Link>
    </div>
  );
}
