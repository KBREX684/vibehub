import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)] mb-3">404</p>
      <h1 className="text-2xl md:text-3xl font-semibold text-[var(--color-text-primary)] mb-3">Page not found</h1>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-8 leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link href="/" className="btn btn-primary px-6 py-2.5 text-sm font-semibold">
        Back to home
      </Link>
    </div>
  );
}
