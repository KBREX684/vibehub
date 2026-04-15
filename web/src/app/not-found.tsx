import Link from "next/link";
import { getServerTranslator } from "@/lib/i18n";

export default async function NotFound() {
  const { t } = await getServerTranslator();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)] mb-3">404</p>
      <h1 className="text-2xl md:text-3xl font-semibold text-[var(--color-text-primary)] mb-3">{t("not_found.title")}</h1>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-8 leading-relaxed">
        {t("not_found.description")}
      </p>
      <Link href="/" className="btn btn-primary px-6 py-2.5 text-sm font-semibold">
        {t("not_found.back_home")}
      </Link>
    </div>
  );
}
