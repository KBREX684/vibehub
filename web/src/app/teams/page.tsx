import Link from "next/link";
import { listTeams } from "@/lib/repository";
import { Users, Globe, Plus } from "lucide-react";
import { TeamsGridClient } from "@/components/teams-grid-client";
import { CountUp } from "@/components/ui/count-up";

export default async function TeamsPage() {
  const { items, pagination } = await listTeams({ page: 1, limit: 50 });

  return (
    <main className="container pb-24 space-y-8 pt-8">

      {/* Page header */}
      <section className="page-hero flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-[var(--color-border)] animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-accent-violet-subtle)] flex items-center justify-center text-[var(--color-accent-violet)]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] mb-0.5">
              Find Your Crew
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              <CountUp end={pagination.total} duration={1200} /> teams · Join active collaborations building AI-native products
            </p>
          </div>
        </div>

        <Link
          href="/teams/new"
          className="btn btn-primary text-sm px-5 py-2 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Create Team
        </Link>
      </section>

      {/* Teams grid */}
      {items.length === 0 ? (
        <div className="card p-16 text-center">
          <Users className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
            No teams yet
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Create the first team and start building together.
          </p>
          <Link href="/teams/new" className="btn btn-primary text-sm px-5 py-2 inline-flex">
            Create a Team
          </Link>
        </div>
      ) : (
        <TeamsGridClient teams={items} />
      )}

      {/* Create team CTA */}
      <div className="card p-8 text-center border-dashed">
        <Globe className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-3 opacity-60" />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1.5">
          Building something?
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)] mb-4 max-w-sm mx-auto">
          Create a team to organize your collaborators, track milestones, and
          recruit contributors.
        </p>
        <Link href="/teams/new" className="btn btn-secondary text-sm px-5 py-2 inline-flex">
          <Plus className="w-3.5 h-3.5" />
          Create your team
        </Link>
      </div>
    </main>
  );
}
