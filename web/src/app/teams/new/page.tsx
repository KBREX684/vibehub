import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { CreateTeamForm } from "@/components/create-team-form";
import { Users } from "lucide-react";

export default async function NewTeamPage() {
  const session = await getSessionUserFromCookie();
  if (!session) redirect("/login?redirect=/teams/new");

  return (
    <main className="container max-w-xl pb-24 pt-8 space-y-6">
      <div className="flex items-center gap-3 pb-5 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-accent-violet-subtle)] flex items-center justify-center text-[var(--color-accent-violet)]">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Create Team</h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Build a team workspace to collaborate, track tasks, and recruit contributors.
          </p>
        </div>
      </div>
      <CreateTeamForm />
    </main>
  );
}
