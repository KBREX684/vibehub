"use client";

import { type FormEvent, useState } from "react";

const kinds = [
  { value: "discussions_by_weekly_comment_count", label: "讨论周榜（周内新增评论数）" },
  { value: "projects_by_weekly_collaboration_intent_count", label: "项目周榜（周内新增协作意向）" },
] as const;

export function AdminWeeklyMaterializeForm() {
  const [weekStart, setWeekStart] = useState("");
  const [kind, setKind] = useState<(typeof kinds)[number]["value"]>("discussions_by_weekly_comment_count");
  const [limit, setLimit] = useState(15);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/leaderboards/weekly/materialize", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: weekStart.trim() || undefined,
          kind,
          limit,
        }),
      });
      const json = (await res.json()) as {
        data?: { generatedAt?: string; rows?: unknown[] };
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        setStatus("error");
        setMessage(json.error?.message ?? "Request failed");
        return;
      }
      setStatus("done");
      const rows = json.data.rows?.length ?? 0;
      setMessage(`物化成功：${rows} 条排名，生成时间 ${json.data.generatedAt ?? "—"}`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h3>周榜物化（P2-5）</h3>
      <p className="muted small">
        将指定 UTC 自然周的榜单写入快照表；公开接口在有快照时优先返回物化结果。weekStart 须为周一（YYYY-MM-DD），留空则使用当前周。
      </p>
      <div className="discover-filter-grid" style={{ marginTop: "0.75rem" }}>
        <label className="discover-field">
          <span>weekStart（UTC 周一）</span>
          <input
            type="text"
            name="weekStart"
            placeholder="例如 2026-04-06"
            value={weekStart}
            onChange={(ev) => setWeekStart(ev.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="discover-field">
          <span>榜单类型</span>
          <select value={kind} onChange={(ev) => setKind(ev.target.value as (typeof kinds)[number]["value"])}>
            {kinds.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="discover-field">
          <span>条数上限</span>
          <input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(ev) => setLimit(Number.parseInt(ev.target.value, 10) || 15)}
          />
        </label>
      </div>
      <div className="discover-actions" style={{ marginTop: "0.75rem" }}>
        <button type="submit" className="button" disabled={status === "loading"}>
          {status === "loading" ? "物化中…" : "写入快照"}
        </button>
      </div>
      {message ? (
        <p className={status === "error" ? "error-text" : "muted small"} style={{ marginTop: "0.75rem" }}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
