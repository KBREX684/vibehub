"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import type { ApiKeyCreated, ApiKeySummary } from "@/lib/types";

interface Props {
  currentUserId: string | null;
}

export function ApiKeysPanel({ currentUserId }: Props) {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [lastSecret, setLastSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/v1/me/api-keys", { credentials: "include" });
      const json = (await res.json()) as { data?: { keys?: ApiKeySummary[] }; error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Failed to load keys");
        setKeys([]);
        return;
      }
      setKeys(json.data?.keys ?? []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUserId) {
      void load();
    }
  }, [currentUserId, load]);

  async function createKey(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLastSecret(null);
    try {
      const res = await fetch("/api/v1/me/api-keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      const json = (await res.json()) as { data?: { key?: ApiKeyCreated }; error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Create failed");
        return;
      }
      const k = json.data?.key;
      if (k?.secret) {
        setLastSecret(k.secret);
      }
      setNewLabel("");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function revoke(id: string) {
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/me/api-keys/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Revoke failed");
        return;
      }
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  if (!currentUserId) {
    return (
      <p className="muted small">
        <a href="/api/v1/auth/demo-login?role=user&redirect=/settings/api-keys" className="inline-link">
          Demo 登录
        </a>
        后可创建与管理 API Key。
      </p>
    );
  }

  return (
    <div className="card">
      <h2>API Keys（P4-1）</h2>
      <p className="muted small">
        用于脚本或集成调用部分接口（当前示例：<code>GET /api/v1/me/teams</code> 支持{" "}
        <code>Authorization: Bearer &lt;secret&gt;</code>）。密钥仅创建时显示一次，请立即保存。
      </p>

      <form onSubmit={(ev) => void createKey(ev)} className="discover-filter-grid" style={{ marginTop: "1rem" }}>
        <label className="discover-field" style={{ gridColumn: "1 / -1" }}>
          <span>标签</span>
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} required maxLength={80} />
        </label>
        <div className="discover-actions">
          <button type="submit" className="button">
            生成密钥
          </button>
        </div>
      </form>

      {lastSecret ? (
        <p className="error-text" style={{ marginTop: "1rem", wordBreak: "break-all" }}>
          <strong>新密钥（仅此一次）：</strong>
          {lastSecret}
        </p>
      ) : null}

      {msg ? <p className="error-text">{msg}</p> : null}
      {loading ? <p className="muted small">加载中…</p> : null}

      <ul className="admin-list" style={{ marginTop: "1rem", listStyle: "none", padding: 0 }}>
        {keys.map((k) => (
          <li key={k.id} className="card" style={{ marginBottom: "0.5rem" }}>
            <div className="meta-row">
              <strong>{k.label}</strong>
              <code className="muted small">{k.prefix}…</code>
            </div>
            <p className="muted small">
              创建于 {new Date(k.createdAt).toLocaleString()}
              {k.revokedAt ? ` · 已撤销 ${new Date(k.revokedAt).toLocaleString()}` : ""}
              {k.lastUsedAt && !k.revokedAt ? ` · 最近使用 ${new Date(k.lastUsedAt).toLocaleString()}` : ""}
            </p>
            {!k.revokedAt ? (
              <button type="button" className="button ghost" onClick={() => void revoke(k.id)}>
                撤销
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
