"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamMember, TeamTask, TeamTaskStatus } from "@/lib/types";

interface Props {
  teamSlug: string;
  members: TeamMember[];
  currentUserId: string | null;
}

const STATUSES: { value: TeamTaskStatus; label: string }[] = [
  { value: "todo", label: "待办" },
  { value: "doing", label: "进行中" },
  { value: "done", label: "完成" },
];

export function TeamTasksPanel({ teamSlug, members, currentUserId }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAssignee, setNewAssignee] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks`, {
        credentials: "include",
      });
      const json = (await res.json()) as { data?: { tasks?: TeamTask[] }; error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Failed to load tasks");
        setTasks([]);
        return;
      }
      setTasks(json.data?.tasks ?? []);
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

  async function createTask(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const body: Record<string, unknown> = { title: newTitle.trim() };
      if (newDesc.trim()) {
        body.description = newDesc.trim();
      }
      if (newAssignee) {
        body.assigneeUserId = newAssignee;
      }
      const res = await fetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks`, {
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
      setNewTitle("");
      setNewDesc("");
      setNewAssignee("");
      await load();
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function patchTask(taskId: string, patch: Record<string, unknown>) {
    setMsg(null);
    try {
      const res = await fetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks/${encodeURIComponent(taskId)}`,
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

  async function reorderTask(taskId: string, direction: "up" | "down") {
    setMsg(null);
    try {
      const res = await fetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks/${encodeURIComponent(taskId)}/reorder`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction }),
        }
      );
      const json = (await res.json()) as {
        data?: { tasks?: TeamTask[] };
        error?: { message?: string; code?: string };
      };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Reorder failed");
        return;
      }
      if (json.data?.tasks) {
        setTasks(json.data.tasks);
      } else {
        await load();
      }
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeTask(taskId: string) {
    setMsg(null);
    try {
      const res = await fetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks/${encodeURIComponent(taskId)}`,
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
        后可查看与维护团队任务板（成员可见）。
      </p>
    );
  }

  return (
    <div className="card">
      <h2>任务板（P3-4 + P3-6）</h2>
      <p className="muted small">
        成员可创建、更新状态、指派与删除；列表按 <code>sortOrder</code> 排序，可用上移/下移调整顺序。接口：GET/POST
        /api/v1/teams/:slug/tasks；POST …/tasks/:id/reorder
      </p>

      <form onSubmit={(ev) => void createTask(ev)} className="discover-filter-grid" style={{ marginTop: "1rem" }}>
        <label className="discover-field" style={{ gridColumn: "1 / -1" }}>
          <span>新任务标题</span>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required maxLength={200} />
        </label>
        <label className="discover-field" style={{ gridColumn: "1 / -1" }}>
          <span>描述（可选）</span>
          <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} maxLength={2000} />
        </label>
        <label className="discover-field">
          <span>指派（可选）</span>
          <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)}>
            <option value="">未指派</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <div className="discover-actions">
          <button type="submit" className="button">
            添加任务
          </button>
        </div>
      </form>

      {msg ? <p className="error-text">{msg}</p> : null}
      {loading ? <p className="muted small">加载中…</p> : null}

      <ul className="admin-list" style={{ marginTop: "1rem", listStyle: "none", padding: 0 }}>
        {tasks.map((t, index) => (
          <li key={t.id} className="card" style={{ marginBottom: "0.75rem" }}>
            <div className="meta-row">
              <strong>{t.title}</strong>
              <span className={`status status-${t.status}`}>{t.status}</span>
            </div>
            {t.description ? <p className="muted small">{t.description}</p> : null}
            <p className="muted small">
              创建：{t.createdByName}
              {t.assigneeName ? ` · 指派：${t.assigneeName}` : ""}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="button ghost"
                disabled={index === 0}
                onClick={() => void reorderTask(t.id, "up")}
                aria-label="上移任务"
              >
                上移
              </button>
              <button
                type="button"
                className="button ghost"
                disabled={index === tasks.length - 1}
                onClick={() => void reorderTask(t.id, "down")}
                aria-label="下移任务"
              >
                下移
              </button>
              <select
                value={t.status}
                onChange={(e) =>
                  void patchTask(t.id, { status: e.target.value as TeamTaskStatus })
                }
                aria-label="任务状态"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                value={t.assigneeUserId ?? ""}
                onChange={(e) =>
                  void patchTask(t.id, {
                    assigneeUserId: e.target.value === "" ? null : e.target.value,
                  })
                }
                aria-label="指派成员"
              >
                <option value="">未指派</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
              <button type="button" className="button ghost" onClick={() => void removeTask(t.id)}>
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
