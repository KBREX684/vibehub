"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const LAST_TEAM_WORKSPACE_KEY = "vibehub:last-team-workspace";

export function WorkRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    let target = "/work/personal";
    try {
      const lastTeamSlug = window.localStorage.getItem(LAST_TEAM_WORKSPACE_KEY)?.trim();
      if (lastTeamSlug) {
        document.cookie = `vibehub_last_team_workspace=${encodeURIComponent(lastTeamSlug)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        target = `/work/team/${encodeURIComponent(lastTeamSlug)}`;
      }
    } catch {
      // Ignore storage failures and fall back to the personal workspace.
    }
    router.replace(target);
  }, [router]);

  return (
    <main className="container py-16">
      <div className="card p-6 text-sm text-[var(--color-text-secondary)]">正在进入工作台…</div>
    </main>
  );
}
