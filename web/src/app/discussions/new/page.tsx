import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n";
import { NewDiscussionForm } from "./new-discussion-form";
import { MessageSquare } from "lucide-react";

export default async function NewDiscussionPage() {
  const { t } = await getServerTranslator();
  const session = await getSessionUserFromCookie();
  if (!session) redirect("/login?redirect=/discussions/new");

  return (
    <main className="container max-w-2xl pb-24 pt-8 space-y-6">
      <div className="flex items-center gap-3 pb-5 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-accent-cyan-subtle)] flex items-center justify-center text-[var(--color-accent-cyan)]">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{t("discussions.new.title")}</h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {t("discussions.new.subtitle")}
          </p>
        </div>
      </div>
      <NewDiscussionForm />
    </main>
  );
}
