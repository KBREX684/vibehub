"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
        Something went wrong
      </p>
      <h1 className="text-2xl md:text-3xl font-semibold text-[var(--color-text-primary)] mb-3">
        We couldn&apos;t load this page
      </h1>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-8 leading-relaxed">
        An unexpected error occurred. You can try again, or return to the homepage to keep exploring.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="btn btn-primary px-6 py-2.5 text-sm font-semibold"
        >
          Try again
        </button>
        <Link href="/" className="btn btn-secondary px-6 py-2.5 text-sm font-semibold text-center">
          Back to home
        </Link>
      </div>
    </div>
  );
}
