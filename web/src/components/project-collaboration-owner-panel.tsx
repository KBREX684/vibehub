"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CollaborationIntentType } from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";

interface PendingIntent {
  id: string;
  intentType: CollaborationIntentType;
  message?: string;
  pitch?: string;
  whyYou?: string;
  howCollab?: string;
}

interface TeamOption {
  slug: string;
  name: string;
}

interface Props {
  projectSlug: string;
  intents: PendingIntent[];
  teams: TeamOption[];
}

export function ProjectCollaborationOwnerPanel({ projectSlug, intents, teams }: Props) {
  const router = useRouter();
  const [inviteSlug, setInviteSlug] = useState(teams[0]?.slug ?? "");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function performAction(intentId: string, action: "approve" | "reject" | "ignore" | "block") {
    setLoadingId(intentId);
    setError(null);
    try {
      const path =
        action === "ignore"
          ? `/api/v1/projects/${encodeURIComponent(projectSlug)}/collaboration-intents/${encodeURIComponent(intentId)}/ignore`
          : action === "block"
            ? `/api/v1/projects/${encodeURIComponent(projectSlug)}/collaboration-intents/${encodeURIComponent(intentId)}/block-and-report`
            : `/api/v1/projects/${encodeURIComponent(projectSlug)}/collaboration-intents/${encodeURIComponent(intentId)}/review`;
      const body: Record<string, unknown> = action === "approve" || action === "reject" ? { action } : {};
      if (action === "approve" && inviteSlug) {
        body.inviteToTeamSlug = inviteSlug;
      }
      if (action === "block") {
        body.note = "Blocked by project owner from project detail review panel.";
      }
      const res = await apiFetch(
        path,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "处理协作意向失败");
        return;
      }
      router.refresh();
    } catch {
      setError("网络异常");
    } finally {
      setLoadingId(null);
    }
  }

  if (intents.length === 0) {
    return null;
  }

  return (
    <section className="card p-6 border border-[var(--color-accent-cyan-border)]">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">处理协作意向</h2>
      <p className="text-xs text-[var(--color-text-secondary)] mb-4">
        统一处理待审核的协作请求。对于加入团队的意向，你可以在接受时直接邀请对方进入某个团队。
      </p>

      {teams.length > 0 ? (
        <div className="mb-5">
          <label htmlFor="collab-invite-team" className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5">
            接受后邀请加入的团队（可选）
          </label>
          <select
            id="collab-invite-team"
            value={inviteSlug}
            onChange={(e) => setInviteSlug(e.target.value)}
            className="input-base text-sm max-w-md"
          >
            <option value="">不自动加入团队</option>
            {teams.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          先创建并绑定团队后，接受加入意向时才可以一键邀请对方进入团队。
        </p>
      )}

      {error ? <p className="text-xs text-[var(--color-error)] mb-3">{error}</p> : null}

      <ul className="space-y-3">
        {intents.map((intent) => (
          <li
            key={intent.id}
            className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-[var(--color-text-muted)] capitalize">{intent.intentType}</span>
            </div>
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)] mb-3">
              <div>
                <div className="mb-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">我是谁 / 我能做什么</div>
                <p className="m-0 whitespace-pre-wrap">{intent.pitch || intent.message}</p>
              </div>
              {intent.whyYou ? (
                <div>
                  <div className="mb-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">我为什么联系你</div>
                  <p className="m-0 whitespace-pre-wrap">{intent.whyYou}</p>
                </div>
              ) : null}
              {intent.howCollab ? (
                <div>
                  <div className="mb-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">我希望怎样合作</div>
                  <p className="m-0 whitespace-pre-wrap">{intent.howCollab}</p>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary text-xs px-3 py-1.5"
                disabled={loadingId !== null}
                onClick={() => void performAction(intent.id, "approve")}
              >
                {loadingId === intent.id ? "…" : "接受"}
              </button>
              <button
                type="button"
                className="btn btn-secondary text-xs px-3 py-1.5"
                disabled={loadingId !== null}
                onClick={() => void performAction(intent.id, "reject")}
              >
                婉拒
              </button>
              <button
                type="button"
                className="btn btn-ghost text-xs px-3 py-1.5"
                disabled={loadingId !== null}
                onClick={() => void performAction(intent.id, "ignore")}
              >
                忽略
              </button>
              <button
                type="button"
                className="btn btn-ghost text-xs px-3 py-1.5 text-[var(--color-error)] border border-[var(--color-error-border-strong)]"
                disabled={loadingId !== null}
                onClick={() => void performAction(intent.id, "block")}
              >
                拉黑并举报
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
