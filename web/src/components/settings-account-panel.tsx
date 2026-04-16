"use client";

import { useState } from "react";
import { apiFetch, resetCsrfToken } from "@/lib/api-fetch";

export function SettingsAccountPanel(props: {
  email: string | null;
  githubLinked: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function unlinkGitHub() {
    if (!confirm("Unlink GitHub from this account?")) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await apiFetch("/api/v1/me/account/github", { method: "DELETE" });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(j?.error?.message ?? "Could not unlink");
        return;
      }
      setMsg("GitHub unlinked.");
      resetCsrfToken();
      window.location.reload();
    } catch {
      setErr("Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    const typed = window.prompt('Type "DELETE" to permanently delete your account:');
    if (typed !== "DELETE") return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await apiFetch("/api/v1/me/account", { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setErr(j?.error?.message ?? "Could not delete account");
        return;
      }
      resetCsrfToken();
      window.location.href = "/";
    } catch {
      setErr("Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-[var(--color-text-muted)] m-0 mb-1">Signed-in email</p>
        <p className="text-sm text-[var(--color-text-primary)] m-0">{props.email ?? "—"}</p>
      </div>

      {props.githubLinked && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 space-y-2">
          <p className="text-sm font-medium text-[var(--color-text-primary)] m-0">GitHub</p>
          <p className="text-xs text-[var(--color-text-secondary)] m-0">
            Unlink only after you can sign in with email and password, or you may lose access.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={unlinkGitHub}
            className="btn btn-secondary text-xs py-1.5"
          >
            Unlink GitHub
          </button>
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-error)]/30 p-4 space-y-2">
        <p className="text-sm font-medium text-[var(--color-error)] m-0">Danger zone</p>
        <p className="text-xs text-[var(--color-text-secondary)] m-0">
          Permanently delete your account and associated data. This cannot be undone.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={deleteAccount}
          className="btn text-xs py-1.5 border-[var(--color-error)] text-[var(--color-error)]"
        >
          Delete account
        </button>
      </div>

      {msg && <p className="text-xs text-[var(--color-text-secondary)] m-0">{msg}</p>}
      {err && <p className="text-xs text-[var(--color-error)] m-0">{err}</p>}
    </div>
  );
}
