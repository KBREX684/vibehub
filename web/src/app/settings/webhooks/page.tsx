import { redirect } from "next/navigation";
import { Webhook } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n";
import { WebhooksClient } from "./webhooks-client";

export default async function WebhooksSettingsPage() {
  const session = await getSessionUserFromCookie();
  if (!session) redirect("/login?redirect=/settings/webhooks");

  const { t } = await getServerTranslator();

  return (
    <main className="container max-w-2xl pb-24 pt-8 space-y-6">
      <div className="flex items-start gap-4 pb-6 border-b border-[var(--color-border)]">
        <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent-violet)]">
          <Webhook className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] m-0">{t("settings.webhooks_heading")}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 m-0">
            {t("settings.webhooks_desc")}
          </p>
        </div>
      </div>
      <WebhooksClient />
    </main>
  );
}
