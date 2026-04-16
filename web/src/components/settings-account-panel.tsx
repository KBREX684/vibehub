"use client";

import { useState } from "react";
import { apiFetch, resetCsrfToken } from "@/lib/api-fetch";

export function SettingsAccountPanel(props: {
  email: string | null;
  githubLinked: boolean;
  hasPassword: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function sendPasswordLink() {
    if (!props.email) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await apiFetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: props.email }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(j?.error?.message ?? "Could not send password link");
        return;
      }
      const resetUrl = typeof j?.data?.resetUrl === "string" ? j.data.resetUrl : null;
      setMsg(
        resetUrl
          ? `Password link created. Dev link: ${resetUrl}`
          : props.hasPassword
            ? "Password reset instructions sent if email delivery is configured."
            : "Password setup instructions sent if email delivery is configured."
      );
    } catch {
      setErr("Request failed");
    } finally {
      setBusy(false);
    }
  }

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

      {props.email && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 space-y-2">
          <p className="text-sm font-medium text-[var(--color-text-primary)] m-0">
            {props.hasPassword ? "Password login" : "Set password"}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] m-0">
            {props.hasPassword
              ? "Send a reset link to rotate your email password."
              : "GitHub-linked accounts need an email password before GitHub can be removed safely."}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={sendPasswordLink}
            className="btn btn-secondary text-xs py-1.5"
          >
            {props.hasPassword ? "Send reset link" : "Send setup link"}
          </button>
        </div>
      )}

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

      {!props.githubLinked && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 space-y-2">
          <p className="text-sm font-medium text-[var(--color-text-primary)] m-0">GitHub</p>
          <p className="text-xs text-[var(--color-text-secondary)] m-0">
            Link GitHub as an auxiliary sign-in method for this account.
          </p>
          <a href="/api/v1/auth/github?redirect=/settings/account" className="btn btn-secondary text-xs py-1.5 inline-flex">
            Link GitHub
          </a>
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
