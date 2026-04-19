"use client";

import { useState } from "react";
import { apiFetch, resetCsrfToken } from "@/lib/api-fetch";
import { useLanguage } from "@/app/context/LanguageContext";

export function SettingsAccountPanel(props: {
  email: string | null;
  githubLinked: boolean;
  hasPassword: boolean;
}) {
  const { t } = useLanguage();
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
        setErr(j?.error?.message ?? t("settings.account_panel.password_link_failed", "无法发送密码链接"));
        return;
      }
      const resetUrl = typeof j?.data?.resetUrl === "string" ? j.data.resetUrl : null;
      setMsg(
        resetUrl
          ? `${t("settings.account_panel.password_link_created", "密码链接已生成。")} ${t("auth.form.dev_link", "开发环境链接：")} ${resetUrl}`
          : props.hasPassword
            ? t("settings.account_panel.password_reset_sent", "若已配置邮件服务，密码重置说明已发送。")
            : t("settings.account_panel.password_setup_sent", "若已配置邮件服务，密码设置说明已发送。")
      );
    } catch {
      setErr(t("auth.form.request_failed", "请求失败"));
    } finally {
      setBusy(false);
    }
  }

  async function unlinkGitHub() {
    if (!confirm(t("settings.account_panel.github_unlink_confirm", "确定要从当前账号解绑 GitHub 吗？"))) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await apiFetch("/api/v1/me/account/github", { method: "DELETE" });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(j?.error?.message ?? t("settings.account_panel.github_unlink_failed", "解绑失败"));
        return;
      }
      setMsg(t("settings.account_panel.github_unlinked", "GitHub 已解绑。"));
      resetCsrfToken();
      window.location.reload();
    } catch {
      setErr(t("auth.form.request_failed", "请求失败"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    const typed = window.prompt(
      t("settings.account_panel.delete_prompt", '输入“DELETE”以永久删除账号：')
    );
    if (typed !== "DELETE") return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await apiFetch("/api/v1/me/account", { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setErr(j?.error?.message ?? t("settings.account_panel.delete_failed", "无法删除账号"));
        return;
      }
      resetCsrfToken();
      window.location.href = "/";
    } catch {
      setErr(t("auth.form.request_failed", "请求失败"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-[var(--color-text-muted)] m-0 mb-1">{t("settings.account_panel.email_label", "当前登录邮箱")}</p>
        <p className="text-sm text-[var(--color-text-primary)] m-0">{props.email ?? "—"}</p>
      </div>

      {props.email && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 space-y-2">
          <p className="text-sm font-medium text-[var(--color-text-primary)] m-0">
            {props.hasPassword
              ? t("settings.account_panel.password_title", "密码登录")
              : t("settings.account_panel.set_password_title", "设置密码")}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] m-0">
            {props.hasPassword
              ? t("settings.account_panel.password_description", "发送重置链接以更新当前邮箱密码。")
              : t(
                  "settings.account_panel.set_password_description",
                  "GitHub 绑定账号在安全解绑前，需要先设置邮箱密码。"
                )}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={sendPasswordLink}
            className="btn btn-secondary text-xs py-1.5"
          >
            {props.hasPassword
              ? t("auth.form.send_reset", "发送重置链接")
              : t("settings.account_panel.send_setup", "发送设置链接")}
          </button>
        </div>
      )}

      {props.githubLinked && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 space-y-2">
          <p className="text-sm font-medium text-[var(--color-text-primary)] m-0">{t("settings.account_panel.github_title", "GitHub 绑定")}</p>
          <p className="text-xs text-[var(--color-text-secondary)] m-0">
            {t(
              "settings.account_panel.github_unlink_description",
              "请在确认邮箱密码可用后再解绑，否则可能失去账号访问权限。"
            )}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={unlinkGitHub}
            className="btn btn-secondary text-xs py-1.5"
          >
            {t("settings.account_panel.github_unlink", "解绑 GitHub")}
          </button>
        </div>
      )}

      {!props.githubLinked && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 space-y-2">
          <p className="text-sm font-medium text-[var(--color-text-primary)] m-0">{t("settings.account_panel.github_title", "GitHub 绑定")}</p>
          <p className="text-xs text-[var(--color-text-secondary)] m-0">
            {t(
              "settings.account_panel.github_link_description",
              "将 GitHub 绑定为当前账号的辅助登录方式。"
            )}
          </p>
          <a href="/api/v1/auth/github?redirect=/settings/account" className="btn btn-secondary text-xs py-1.5 inline-flex">
            {t("settings.account_panel.github_link", "绑定 GitHub")}
          </a>
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-error-border-strong)] p-4 space-y-2">
        <p className="text-sm font-medium text-[var(--color-error)] m-0">{t("settings.account_panel.danger_title", "危险操作")}</p>
        <p className="text-xs text-[var(--color-text-secondary)] m-0">
          {t(
            "settings.account_panel.danger_description",
            "永久删除当前账号及其关联数据，此操作不可撤销。"
          )}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={deleteAccount}
          className="btn text-xs py-1.5 border-[var(--color-error)] text-[var(--color-error)]"
        >
          {t("settings.account_panel.delete_account", "删除账号")}
        </button>
      </div>

      {msg && <p className="text-xs text-[var(--color-text-secondary)] m-0">{msg}</p>}
      {err && <p className="text-xs text-[var(--color-error)] m-0">{err}</p>}
    </div>
  );
}
