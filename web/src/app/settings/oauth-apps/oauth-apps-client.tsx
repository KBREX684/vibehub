"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { DEFAULT_API_KEY_SCOPES } from "@/lib/api-key-scopes";
import type { OAuthAppSummary } from "@/lib/types";

type OAuthAppCreated = OAuthAppSummary & { clientSecret: string };

export function OAuthAppsClient() {
  const [apps, setApps] = useState<OAuthAppSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [redirectUris, setRedirectUris] = useState("http://localhost:3001/callback");
  const [scopes, setScopes] = useState<string[]>([...DEFAULT_API_KEY_SCOPES]);
  const [latestSecret, setLatestSecret] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/me/oauth-apps", { credentials: "include" });
      const json = (await res.json()) as { data?: { apps?: OAuthAppSummary[] } };
      setApps(json.data?.apps ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createApp(event: React.FormEvent) {
    event.preventDefault();
    const redirectList = redirectUris
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const res = await apiFetch("/api/v1/me/oauth-apps", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        redirectUris: redirectList,
        scopes,
      }),
    });
    const json = (await res.json()) as { data?: { app?: OAuthAppCreated }; error?: { message?: string } };
    if (!res.ok || !json.data?.app) {
      toast.error(json.error?.message ?? "Failed to create OAuth app");
      return;
    }
    setLatestSecret(json.data.app.clientSecret);
    setName("");
    setDescription("");
    setRedirectUris("http://localhost:3001/callback");
    toast.success("OAuth app created");
    void refresh();
  }

  async function toggleActive(app: OAuthAppSummary) {
    const res = await apiFetch(`/api/v1/me/oauth-apps/${encodeURIComponent(app.id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !app.active }),
    });
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      toast.error(json.error?.message ?? "Failed to update OAuth app");
      return;
    }
    void refresh();
  }

  async function removeApp(app: OAuthAppSummary) {
    const res = await apiFetch(`/api/v1/me/oauth-apps/${encodeURIComponent(app.id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      toast.error(json.error?.message ?? "Failed to delete OAuth app");
      return;
    }
    toast.success("OAuth app deleted");
    void refresh();
  }

  function toggleScope(scope: string) {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((item) => item !== scope) : [...prev, scope]));
  }

  return (
    <div className="space-y-8">
      <form onSubmit={createApp} className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">New OAuth app</h2>
        <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="App name" required />
        <textarea
          className="input-base min-h-24"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this integration is for"
        />
        <textarea
          className="input-base min-h-24 font-mono text-xs"
          value={redirectUris}
          onChange={(e) => setRedirectUris(e.target.value)}
          placeholder="One redirect URI per line"
          required
        />
        <div className="space-y-2">
          <p className="text-xs text-[var(--color-text-muted)] m-0">Scopes</p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_API_KEY_SCOPES.map((scope) => (
              <label key={scope} className="text-xs flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} />
                {scope}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="btn btn-primary w-fit">Create OAuth app</button>
        {latestSecret && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 space-y-2">
            <p className="text-xs font-semibold text-[var(--color-text-primary)] m-0">Client secret</p>
            <p className="text-xs text-[var(--color-text-secondary)] m-0">Shown once. Store it now.</p>
            <code className="block break-all text-xs">{latestSecret}</code>
          </div>
        )}
      </form>

      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">Registered apps</h2>
        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)] m-0">Loading…</p>
        ) : apps.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] m-0">No OAuth apps yet.</p>
        ) : (
          <ul className="space-y-4 list-none m-0 p-0">
            {apps.map((app) => (
              <li key={app.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{app.name}</p>
                    <p className="text-xs font-mono text-[var(--color-text-muted)] m-0">{app.clientId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-secondary text-xs" onClick={() => toggleActive(app)}>
                      {app.active ? "Disable" : "Enable"}
                    </button>
                    <button type="button" className="btn btn-ghost text-xs text-[var(--color-error)]" onClick={() => removeApp(app)}>
                      Delete
                    </button>
                  </div>
                </div>
                {app.description && <p className="text-sm text-[var(--color-text-secondary)] m-0">{app.description}</p>}
                <div className="space-y-1">
                  <p className="text-xs text-[var(--color-text-muted)] m-0">Redirect URIs</p>
                  <ul className="list-none m-0 p-0 space-y-1 text-xs font-mono text-[var(--color-text-secondary)]">
                    {app.redirectUris.map((uri) => (
                      <li key={uri} className="break-all">{uri}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  {app.scopes.map((scope) => (
                    <span key={scope} className="tag">{scope}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
