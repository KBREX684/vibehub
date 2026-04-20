import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderGit2, ArrowLeft, User } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getCreatorProfileByUserId } from "@/lib/repository";
import { CreateProjectForm } from "@/components/create-project-form";
import { getServerTranslator } from "@/lib/i18n";

export async function NewProjectPageContent() {
  const session = await getSessionUserFromCookie();
  if (!session) redirect("/login?redirect=/p/new");

  const { t } = await getServerTranslator();
  const creator = await getCreatorProfileByUserId(session.userId);

  if (!creator) {
    return (
      <main className="container max-w-xl pb-24 pt-8 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("project.new.back")}
        </Link>
        <div className="card p-8 space-y-4 text-center">
          <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--color-bg-elevated)] flex items-center justify-center mx-auto border border-[var(--color-border)]">
            <User className="w-6 h-6 text-[var(--color-text-muted)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] m-0">
            {t("project.new.profile_required_title")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] m-0 max-w-sm mx-auto">
            {t("project.new.profile_required_desc")}
          </p>
          <Link
            href="/settings/profile"
            className="btn btn-primary text-sm px-6 py-2.5 inline-flex"
          >
            {t("project.new.setup_profile")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-2xl pb-24 pt-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("project.new.back")}
      </Link>
      <div className="flex items-center gap-3 pb-5 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center text-[var(--color-primary-hover)]">
          <FolderGit2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] m-0">
            {t("project.new.title")}
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] m-0">
            {t("project.new.subtitle")}
          </p>
        </div>
      </div>
      <CreateProjectForm />
    </main>
  );
}
