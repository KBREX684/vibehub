import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { mockUsers } from "@/lib/data/mock-data";
import { getServerTranslator } from "@/lib/i18n";
import { SettingsAccountPanel } from "@/components/settings-account-panel";
import { ChevronLeft } from "lucide-react";

export default async function AccountSettingsPage() {
  const session = await getSessionUserFromCookie();
  const { t } = await getServerTranslator();
  if (!session) {
    redirect("/login?redirect=/settings/account");
  }

  let email: string | null = null;
  let githubLinked = false;
  let hasPassword = false;
  if (isMockDataEnabled()) {
    const u = mockUsers.find((x) => x.id === session.userId);
    email = u?.email ?? null;
    githubLinked = u?.githubId != null;
    hasPassword = Boolean(u?.passwordHash);
  } else {
    const row = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, githubId: true, passwordHash: true },
    });
    email = row?.email ?? null;
    githubLinked = row?.githubId != null;
    hasPassword = Boolean(row?.passwordHash);
  }

  return (
    <main className="container max-w-2xl pb-24 pt-8 space-y-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ChevronLeft className="w-3 h-3" /> {t("settings.title")}
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] m-0">{t("settings.account_heading")}</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1 m-0">
          {t("settings.account_subtitle")}
        </p>
      </div>
      <div className="card p-6">
        <SettingsAccountPanel email={email} githubLinked={githubLinked} hasPassword={hasPassword} />
      </div>
    </main>
  );
}
