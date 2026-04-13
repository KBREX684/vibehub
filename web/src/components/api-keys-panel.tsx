"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  API_KEY_SCOPE_READ_PUBLIC,
  API_KEY_SCOPES,
  DEFAULT_API_KEY_SCOPES,
} from "@/lib/api-key-scopes";
import type { ApiKeyCreated, ApiKeySummary } from "@/lib/types";

const OPTIONAL_SCOPES = API_KEY_SCOPES.filter((s) => s !== API_KEY_SCOPE_READ_PUBLIC);

interface Props {
  currentUserId: string | null;
}

export function ApiKeysPanel({ currentUserId }: Props) {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [lastSecret, setLastSecret] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const x of DEFAULT_API_KEY_SCOPES) {
      if (x !== API_KEY_SCOPE_READ_PUBLIC) {
        s.add(x);
      }
    }
    return s;
  });

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
        body: JSON.stringify({
          label: newLabel.trim(),
          scopes: [API_KEY_SCOPE_READ_PUBLIC, ...selectedScopes],
        }),
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
      <h2>API Keys（P4-1 + P4-2 + P4-3）</h2>
      <p className="muted small">
        用于脚本或集成；创建时可勾选 <strong>scopes</strong>（必选 <code>read:public</code>）。Bearer 访问受 per-key 速率限制（见{" "}
        <code>API_KEY_RATE_LIMIT_PER_MINUTE</code>
        ）。匿名爬虫请使用 <code>/api/v1/public/...</code> 镜像端点。密钥仅创建时显示一次。
      </p>

      <form onSubmit={(ev) => void createKey(ev)} className="discover-filter-grid" style={{ marginTop: "1rem" }}>
        <label className="discover-field" style={{ gridColumn: "1 / -1" }}>
          <span>标签</span>
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} required maxLength={80} />
        </label>
        <fieldset className="discover-field" style={{ gridColumn: "1 / -1", border: "1px solid var(--line)", borderRadius: 10, padding: "0.75rem" }}>
          <legend className="muted small" style={{ padding: "0 0.35rem" }}>
            Scopes（除 read:public 外可取消勾选）
          </legend>
          <label className="muted small" style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: 6 }}>
            <input type="checkbox" checked disabled />
            <code>{API_KEY_SCOPE_READ_PUBLIC}</code>（必选）
          </label>
          <div className="discover-filter-grid" style={{ marginTop: 4 }}>
            {OPTIONAL_SCOPES.map((s) => (
              <label key={s} className="muted small" style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={selectedScopes.has(s)}
                  onChange={() => {
                    setSelectedScopes((prev) => {
                      const n = new Set(prev);
                      if (n.has(s)) {
                        n.delete(s);
                      } else {
                        n.add(s);
                      }
                      return n;
                    });
                  }}
                />
                <code>{s}</code>
              </label>
            ))}
          </div>
        </fieldset>
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
            <p className="muted small" style={{ wordBreak: "break-word" }}>
              scopes: {k.scopes.join(", ")}
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
