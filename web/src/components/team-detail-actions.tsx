"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamDetail } from "@/lib/types";

interface Props {
  team: TeamDetail;
  currentUserId: string | null;
}

export function TeamDetailActions({ team, currentUserId }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const membership = currentUserId ? team.members.find((m) => m.userId === currentUserId) : undefined;
  const isOwner = currentUserId === team.ownerUserId;

  async function join() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/teams/${encodeURIComponent(team.slug)}/join`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Join failed");
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
        后可加入团队；队长可用邮箱邀请已注册用户。
      </p>
    );
  }

  return (
    <div className="card">
      <h3>成员操作</h3>
      {!membership ? (
        <p>
          <button type="button" className="button" disabled={busy} onClick={() => void join()}>
            加入团队
          </button>
        </p>
      ) : membership.role === "owner" ? (
        <p className="muted small">你是队长（owner）。</p>
      ) : (
        <p>
          <button type="button" className="button ghost" disabled={busy} onClick={() => void leave()}>
            退出团队
          </button>
        </p>
      )}

      {isOwner ? (
        <form onSubmit={(ev) => void addByEmail(ev)} className="discover-filter-grid" style={{ marginTop: "1rem" }}>
          <label className="discover-field" style={{ gridColumn: "1 / -1" }}>
            <span>按邮箱添加成员（须已注册）</span>
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
