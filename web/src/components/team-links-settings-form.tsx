"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";
import { useLanguage } from "@/app/context/LanguageContext";

const FIELDS = [
  { key: "discordUrl", labelKey: "team.settings.field_discordUrl" },
  { key: "telegramUrl", labelKey: "team.settings.field_telegramUrl" },
  { key: "slackUrl", labelKey: "team.settings.field_slackUrl" },
  { key: "githubOrgUrl", labelKey: "team.settings.field_githubOrgUrl" },
  { key: "githubRepoUrl", labelKey: "team.settings.field_githubRepoUrl" },
] as const;

type LinkKey = (typeof FIELDS)[number]["key"];

export interface TeamLinksInitial {
  discordUrl?: string;
  telegramUrl?: string;
  slackUrl?: string;
  githubOrgUrl?: string;
  githubRepoUrl?: string;
}

interface Props {
  teamSlug: string;
  initial: TeamLinksInitial;
}

export function TeamLinksSettingsForm({ teamSlug, initial }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const [values, setValues] = useState<Record<LinkKey, string>>({
    discordUrl: initial.discordUrl ?? "",
    telegramUrl: initial.telegramUrl ?? "",
    slackUrl: initial.slackUrl ?? "",
    githubOrgUrl: initial.githubOrgUrl ?? "",
    githubRepoUrl: initial.githubRepoUrl ?? "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    const body: Record<string, string | null> = {};
    for (const { key } of FIELDS) {
      const v = values[key].trim();
      body[key] = v === "" ? null : v;
    }
    try {
      const res = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/links`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setStatus("error");
        setMessage(json.error?.message ?? t("common.update_failed"));
        return;
      }
      setStatus("success");
      setMessage(t("team.settings.links_saved"));
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-5">
      <p className="text-xs text-[var(--color-text-muted)] m-0">
        {t("team.settings.links_hint_prefix", "Use full")}{" "}
        <code className="text-[var(--color-text-secondary)]">https://</code>{" "}
        {t("team.settings.links_hint_suffix", "links. These are shown on the team page and reused by project, GitHub, and community discovery surfaces. Leave blank to clear a field.")}
      </p>
      {FIELDS.map(({ key, labelKey }) => (
        <div key={key} className="space-y-1.5">
          <label htmlFor={`team-link-${key}`} className="text-xs font-semibold text-[var(--color-text-secondary)]">
            {t(labelKey)}
          </label>
          <input
            id={`team-link-${key}`}
            name={key}
            value={values[key]}
            onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
            className="input-base"
            type="url"
            placeholder="https://"
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" className="btn btn-primary text-sm px-5 py-2" disabled={status === "loading"}>
          {status === "loading" ? t("common.saving") : t("team.settings.save_links")}
        </button>
        <button type="button" className="btn btn-secondary text-sm px-5 py-2" onClick={() => router.push(`/teams/${encodeURIComponent(teamSlug)}`)}>
          {t("team.back_to_team")}
        </button>
      </div>
      {message ? (
        <p
          className={`text-sm m-0 ${status === "success" ? "text-[var(--color-accent-apple)]" : "text-[var(--color-error)]"}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
