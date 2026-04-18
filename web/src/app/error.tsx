"use client";

import Link from "next/link";
import { useLanguage } from "@/app/context/LanguageContext";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
        {t("error.eyebrow", "Something went wrong")}
      </p>
      <h1 className="text-2xl md:text-3xl font-semibold text-[var(--color-text-primary)] mb-3">
        {t("error.title", "We couldn't load this page")}
      </h1>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-8 leading-relaxed">
        {t(
          "error.description",
          "An unexpected error occurred. You can try again, or return to the homepage to keep exploring."
        )}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="btn btn-primary px-6 py-2.5 text-sm font-semibold"
        >
          {t("error.retry", "Try again")}
        </button>
        <Link href="/" className="btn btn-secondary px-6 py-2.5 text-sm font-semibold text-center">
          {t("error.back_home", "Back to home")}
        </Link>
      </div>
    </div>
  );
}
