import { redirect } from "next/navigation";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getCreatorProfileByUserId } from "@/lib/repository";
import { ProfileForm } from "./profile-form";

export default async function SettingsProfilePage() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/api/v1/auth/github?redirect=/settings/profile");
  }

  const profile = await getCreatorProfileByUserId(session.userId);

  return (
    <main className="container max-w-3xl pb-24 pt-8 space-y-6">
      <section className="flex items-center gap-4 pb-5 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-accent-violet-subtle)] flex items-center justify-center text-[var(--color-accent-violet)]">
          <UserRound className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] m-0">Profile Settings</h1>
          <p className="text-sm text-[var(--color-text-secondary)] m-0">
            Edit your creator profile and social links.
          </p>
        </div>
      </section>

      <div className="card p-4">
        <p className="text-xs text-[var(--color-text-muted)] m-0">
          Public profile URL:{" "}
          {profile ? (
            <Link
              href={`/creators/${encodeURIComponent(profile.slug)}`}
              className="text-[var(--color-text-secondary)] underline underline-offset-2 hover:text-[var(--color-text-primary)]"
            >
              /creators/{profile.slug}
            </Link>
          ) : (
            <span className="text-[var(--color-text-secondary)]">Create your profile first to claim a public URL.</span>
          )}
        </p>
      </div>

      <ProfileForm initialProfile={profile} />
    </main>
  );
}
