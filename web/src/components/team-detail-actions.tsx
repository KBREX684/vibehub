"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamDetail, TeamJoinRequestRow } from "@/lib/types";

interface Props {
  team: TeamDetail;
  currentUserId: string | null;
}

export function TeamDetailActions({ team, currentUserId }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const membership = currentUserId ? team.members.find((m) => m.userId === currentUserId) : undefined;
  const isOwner = currentUserId === team.ownerUserId;
  const pending = team.pendingJoinRequests ?? [];

  async function requestJoin() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/teams/${encodeURIComponent(team.slug)}/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: joinMessage.trim() || undefined }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Request failed");
        return;
      }
      setJoinMessage("");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function reviewRequest(requestId: string, action: "approve" | "reject") {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/v1/teams/${encodeURIComponent(team.slug)}/join-requests/${encodeURIComponent(requestId)}/review`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Review failed");
        return;
      }
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!currentUserId) {
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/v1/teams/${encodeURIComponent(team.slug)}/members/${encodeURIComponent(currentUserId)}`,
        { method: "DELETE", credentials: "include" }
      );
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Leave failed");
        return;
      }
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(userId: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/v1/teams/${encodeURIComponent(team.slug)}/members/${encodeURIComponent(userId)}`,
        { method: "DELETE", credentials: "include" }
      );
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Remove failed");
        return;
      }
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function addByEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/teams/${encodeURIComponent(team.slug)}/members`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Add failed");
        return;
      }
      setEmail("");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!currentUserId) {
    return (
      <p className="muted small">
        <a
          href={`/api/v1/auth/demo-login?role=user&redirect=${encodeURIComponent(`/teams/${team.slug}`)}`}
          className="inline-link"
        >
          Demo 登录
        </a>
        后可提交入队申请；队长可审批申请或按邮箱直接邀请。
      </p>
    );
  }

  return (
    <div className="card">
      <h3>成员与入队（P3-2）</h3>
      {!membership ? (
        team.viewerPendingJoinRequest ? (
          <p className="muted small">你的入队申请待队长审批。</p>
        ) : (
          <div>
            <label className="discover-field" style={{ display: "block", marginBottom: "0.5rem" }}>
              <span>申请说明（可选）</span>
              <textarea
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="简单介绍你能贡献的方向…"
              />
            </label>
            <button type="button" className="button" disabled={busy} onClick={() => void requestJoin()}>
              提交入队申请
            </button>
          </div>
        )
      ) : membership.role === "owner" ? (
        <p className="muted small">你是队长（owner）。</p>
      ) : (
        <p>
          <button type="button" className="button ghost" disabled={busy} onClick={() => void leave()}>
            退出团队
          </button>
        </p>
      )}

      {isOwner && pending.length > 0 ? (
        <section style={{ marginTop: "1rem" }}>
          <h4>待审批入队申请</h4>
          <ul className="admin-list" style={{ listStyle: "none", padding: 0 }}>
            {pending.map((r: TeamJoinRequestRow) => (
              <li key={r.id} className="card" style={{ marginBottom: "0.75rem" }}>
                <strong>{r.applicantName}</strong>
                <div className="muted small">{r.applicantEmail}</div>
                {r.message ? <p>{r.message}</p> : null}
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    className="button"
                    disabled={busy}
                    onClick={() => void reviewRequest(r.id, "approve")}
                  >
                    通过
                  </button>
                  <button
                    type="button"
                    className="button ghost"
                    disabled={busy}
                    onClick={() => void reviewRequest(r.id, "reject")}
                  >
                    拒绝
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isOwner ? (
        <form onSubmit={(ev) => void addByEmail(ev)} className="discover-filter-grid" style={{ marginTop: "1rem" }}>
          <label className="discover-field" style={{ gridColumn: "1 / -1" }}>
            <span>按邮箱添加成员（须已注册，直接入队）</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              required
            />
          </label>
          <div className="discover-actions">
            <button type="submit" className="button" disabled={busy}>
              添加
            </button>
          </div>
        </form>
      ) : null}

      {isOwner ? (
        <ul className="muted small" style={{ marginTop: "1rem", listStyle: "none", padding: 0 }}>
          {team.members
            .filter((m) => m.role !== "owner")
            .map((m) => (
              <li key={m.userId} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                <span>
                  {m.name} ({m.email})
                </span>
                <button type="button" className="button ghost" disabled={busy} onClick={() => void removeMember(m.userId)}>
                  移除
                </button>
              </li>
            ))}
        </ul>
      ) : null}

      {msg ? <p className="error-text">{msg}</p> : null}
    </div>
  );
}
