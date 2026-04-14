import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderGit2, ArrowLeft } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getCreatorProfileByUserId } from "@/lib/repository";
import { CreateProjectForm } from "@/components/create-project-form";

export default async function NewProjectPage() {
  const session = await getSessionUserFromCookie();
  if (!session) redirect("/login?redirect=/projects/new");

  const creator = await getCreatorProfileByUserId(session.userId);
  if (!creator) {
    return (
      <main className="container max-w-xl pb-24 pt-8 space-y-6">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Discover
        </Link>
        <div className="card p-8 space-y-3">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] m-0">Creator profile required</h1>
          <p className="text-sm text-[var(--color-text-secondary)] m-0">
            Complete a creator profile before publishing a project. After GitHub signup, finish onboarding from the
            home flow, or ask an admin to seed your profile in development.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-2xl pb-24 pt-8 space-y-6">
      <Link
        href="/discover"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Discover
      </Link>
      <div className="flex items-center gap-3 pb-5 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center text-[var(--color-primary-hover)]">
          <FolderGit2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] m-0">New project</h1>
          <p className="text-xs text-[var(--color-text-secondary)] m-0">
            Creates a public project via <span className="font-mono">POST /api/v1/projects</span>.
          </p>
        </div>
      </div>
      <CreateProjectForm />
    </main>
  );
}
