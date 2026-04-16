import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { mockUsers } from "@/lib/data/mock-data";
import { SettingsAccountPanel } from "@/components/settings-account-panel";
import { ChevronLeft } from "lucide-react";

export default async function AccountSettingsPage() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/login?redirect=/settings/account");
  }

  let email: string | null = null;
  let githubLinked = false;
  if (isMockDataEnabled()) {
    const u = mockUsers.find((x) => x.id === session.userId);
    email = u?.email ?? null;
    githubLinked = u?.githubId != null;
  } else {
    const row = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, githubId: true },
    });
    email = row?.email ?? null;
    githubLinked = row?.githubId != null;
  }

  return (
    <main className="container max-w-2xl pb-24 pt-8 space-y-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ChevronLeft className="w-3 h-3" /> Settings
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] m-0">Account</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1 m-0">
          Email login, linked providers, and account deletion.
        </p>
      </div>
      <div className="card p-6">
        <SettingsAccountPanel email={email} githubLinked={githubLinked} />
      </div>
    </main>
  );
}
