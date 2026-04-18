import type { Metadata } from "next";
import { getServerTranslator } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t("legal.privacy.metaTitle"),
    description: t("legal.privacy.metaDescription"),
  };
}

export default async function PrivacyPage() {
  const { t } = await getServerTranslator();
  const sections = [
    "overview",
    "collect",
    "use",
    "ai",
    "crossBorder",
    "retention",
  ] as const;

  return (
    <main className="container max-w-3xl py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
        {t("legal.privacy.title")}
      </h1>
      <p className="mb-10 text-sm text-[var(--color-text-muted)]">{t("legal.common.lastUpdated")}</p>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section} className="card p-6">
            <h2 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
              {t(`legal.privacy.sections.${section}.title`)}
            </h2>
            <p className="m-0 text-sm leading-6 text-[var(--color-text-secondary)]">
              {t(`legal.privacy.sections.${section}.body`)}
            </p>
          </section>
        ))}

        <section className="card p-6">
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
            {t("legal.common.contact")}
          </h2>
          <p className="m-0 text-sm leading-6 text-[var(--color-text-secondary)]">
            {t("legal.common.contactBody")}
          </p>
        </section>
      </div>
    </main>
  );
}
