"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamMilestone } from "@/lib/types";

interface Props {
  teamSlug: string;
  currentUserId: string | null;
}

export function TeamMilestonesPanel({ teamSlug, currentUserId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<TeamMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/milestones`, {
        credentials: "include",
      });
      const json = (await res.json()) as { data?: { milestones?: TeamMilestone[] }; error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Failed to load milestones");
        setItems([]);
        return;
      }
      setItems(json.data?.milestones ?? []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [teamSlug]);

  useEffect(() => {
    if (currentUserId) {
      void load();
    }
  }, [currentUserId, load]);

  async function createMilestone(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const [y, mo, d] = targetDate.split("-").map(Number);
      const targetIso = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0, 0)).toISOString();
      const body: Record<string, unknown> = {
        title: title.trim(),
        targetDate: targetIso,
      };
      if (description.trim()) {
        body.description = description.trim();
      }
      const res = await fetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/milestones`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Create failed");
        return;
      }
      setTitle("");
      setDescription("");
      setTargetDate("");
      await load();
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function patchMilestone(id: string, patch: Record<string, unknown>) {
    setMsg(null);
    try {
      const res = await fetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/milestones/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }
      );
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Update failed");
        return;
      }
      await load();
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeMilestone(id: string) {
    setMsg(null);
    try {
      const res = await fetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/milestones/${encodeURIComponent(id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Delete failed");
        return;
      }
      await load();
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  if (!currentUserId) {
    return (
      <p className="muted small">
        <a
          href={`/api/v1/auth/demo-login?role=user&redirect=${encodeURIComponent(`/teams/${teamSlug}`)}`}
          className="inline-link"
        >
          Demo 登录
        </a>
        后可查看与维护里程碑时间线（成员可见）。
      </p>
    );
  }

  return (
    <div className="card">
      <h2>里程碑（P3-5）</h2>
      <p className="muted small">目标日期 + 完成勾选；成员可增删改。接口：GET/POST /api/v1/teams/:slug/milestones</p>

      <form onSubmit={(ev) => void createMilestone(ev)} className="discover-filter-grid" style={{ marginTop: "1rem" }}>
        <label className="discover-field">
          <span>标题</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
        </label>
        <label className="discover-field">
          <span>目标日期</span>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} required />
        </label>
        <label className="discover-field" style={{ gridColumn: "1 / -1" }}>
          <span>描述（可选）</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} />
        </label>
        <div className="discover-actions">
          <button type="submit" className="button">
            添加里程碑
          </button>
        </div>
      </form>

      {msg ? <p className="error-text">{msg}</p> : null}
      {loading ? <p className="muted small">加载中…</p> : null}

      <ol className="leaderboard-list" style={{ marginTop: "1rem" }}>
        {items.map((m) => (
          <li key={m.id}>
            <span className="rank-pill">{m.sortOrder}</span>
            <div style={{ flex: 1 }}>
              <div className="meta-row">
                <strong>{m.title}</strong>
                {m.completed ? (
                  <span className="status-approved">已完成</span>
                ) : (
                  <span className="status-pending">进行中</span>
                )}
              </div>
              <div className="muted small">
                目标：{new Date(m.targetDate).toLocaleDateString()} · 创建：{m.createdByName}
                {" · "}
                <span style={{ color: m.visibility === "public" ? "#15803d" : "#6b7280" }}>
                  {m.visibility === "public" ? "🌐 公开" : "🔒 仅团队"}
                </span>
              </div>
              {m.description ? <p className="muted small">{m.description}</p> : null}
              {/* T-2: progress bar */}
              <div style={{ marginTop: 6 }}>
                <div style={{ background: "var(--line)", borderRadius: 999, height: 6 }}>
                  <div style={{ width: `${m.progress}%`, background: m.completed ? "#16a34a" : "var(--brand)", height: "100%", borderRadius: 999 }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span className="muted small">{m.progress}%</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={m.progress}
                    style={{ flex: 1 }}
                    onChange={(e) => void patchMilestone(m.id, { progress: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.35rem" }}>
                <label className="muted small" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <input
                    type="checkbox"
                    checked={m.completed}
                    onChange={(e) => void patchMilestone(m.id, { completed: e.target.checked })}
                  />
                  标记完成
                </label>
                <label className="muted small" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <input
                    type="checkbox"
                    checked={m.visibility === "public"}
                    onChange={(e) => void patchMilestone(m.id, { visibility: e.target.checked ? "public" : "team_only" })}
                  />
                  公开展示
                </label>
                <button type="button" className="button ghost" onClick={() => void removeMilestone(m.id)}>
                  删除
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
