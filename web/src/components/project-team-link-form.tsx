"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectTeamSummary } from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";

interface MeTeamsResponse {
  data?: { teams?: { slug: string; name: string }[] };
  error?: { message?: string };
}

interface Props {
  project: Project;
  /** Creator's user id (from session on server) — only show form when viewer is creator. */
  canEdit: boolean;
}

export function ProjectTeamLinkForm({ project, canEdit }: Props) {
  const router = useRouter();
  const [teams, setTeams] = useState<{ slug: string; name: string }[]>([]);
  const [teamSlug, setTeamSlug] = useState(project.team?.slug ?? "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!canEdit) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await apiFetch("/api/v1/me/teams", { credentials: "include" });
      const json = (await res.json()) as MeTeamsResponse;
      if (!cancelled && res.ok && json.data?.teams) {
        setTeams(json.data.teams);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canEdit]);

  useEffect(() => {
    setTeamSlug(project.team?.slug ?? "");
  }, [project.team?.slug]);

  if (!canEdit) {
    return project.team ? (
      <p className="muted small">
        团队：{" "}
        <a href={`/work/team/${encodeURIComponent(project.team.slug)}`} className="inline-link">
          {project.team.name}
        </a>
      </p>
    ) : null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const body =
        teamSlug === "" ? { teamSlug: null } : { teamSlug: teamSlug.trim() };
      const res = await apiFetch(`/api/v1/projects/${encodeURIComponent(project.slug)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { data?: Project; error?: { message?: string } };
      if (!res.ok || !json.data) {
        setMsg(json.error?.message ?? "更新失败");
        return;
      }
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const current: ProjectTeamSummary | undefined = project.team;

  return (
    <form className="card" onSubmit={(ev) => void onSubmit(ev)}>
      <h3>团队归属</h3>
      <p className="muted small">仅项目创建者可绑定；你必须已经是目标团队成员。</p>
      {current ? (
        <p className="muted small">
          当前：
          <a href={`/work/team/${encodeURIComponent(current.slug)}`} className="inline-link">
            {current.name}
          </a>
        </p>
      ) : (
        <p className="muted small">当前未绑定团队工作区。</p>
      )}
      <label className="discover-field" style={{ display: "block", marginTop: "0.5rem" }}>
          <span>选择团队工作区</span>
        <select value={teamSlug} onChange={(ev) => setTeamSlug(ev.target.value)}>
          <option value="">（保持在个人工作区）</option>
          {teams.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name} ({t.slug})
            </option>
          ))}
        </select>
      </label>
      <div className="discover-actions" style={{ marginTop: "0.75rem" }}>
        <button type="submit" className="button" disabled={loading}>
          {loading ? "保存中…" : "保存归属"}
        </button>
      </div>
      {msg ? <p className="error-text">{msg}</p> : null}
    </form>
  );
}
