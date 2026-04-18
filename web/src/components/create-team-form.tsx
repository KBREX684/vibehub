"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { UpgradeReason } from "@/lib/subscription";
import { useLanguage } from "@/app/context/LanguageContext";
import { UpgradePlanCallout } from "@/components/upgrade-plan-callout";
import { apiFetch } from "@/lib/api-fetch";

export function CreateTeamForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [mission, setMission] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | undefined>(undefined);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    setUpgradeReason(undefined);
    try {
      const body: { name: string; slug?: string; mission?: string } = { name: name.trim() };
      const s = slug.trim();
      if (s) {
        body.slug = s;
      }
      const m = mission.trim();
      if (m) {
        body.mission = m;
      }
      const res = await apiFetch("/api/v1/teams", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        data?: { slug?: string };
        error?: { message?: string; details?: { upgradeReason?: UpgradeReason } };
      };
      if (!res.ok || !json.data?.slug) {
        setStatus("error");
        setMessage(json.error?.message ?? t("team.form.createFailed"));
        setUpgradeReason(json.error?.details?.upgradeReason);
        return;
      }
      router.push(`/teams/${encodeURIComponent(json.data.slug)}`);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form className="card discover-filters" onSubmit={onSubmit}>
      <h2>{t("team.form.title")}</h2>
      <p className="muted small">{t("team.form.subtitle")}</p>
      <div className="discover-filter-grid" style={{ marginTop: "0.75rem" }}>
        <label className="discover-field">
          <span>{t("team.form.name")}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} />
        </label>
        <label className="discover-field">
          <span>{t("team.form.slug")}</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={t("team.form.slugPlaceholder")}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title={t("team.form.slugHint")}
          />
        </label>
        <label className="discover-field" style={{ gridColumn: "1 / -1" }}>
          <span>{t("team.form.mission")}</span>
          <input
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            maxLength={500}
            placeholder={t("team.form.missionPlaceholder")}
          />
        </label>
      </div>
      <div className="discover-actions">
        <button type="submit" className="button" disabled={status === "loading"}>
          {status === "loading" ? t("team.form.submitting") : t("team.form.submit")}
        </button>
      </div>
      {message ? <p className="error-text">{message}</p> : null}
      {upgradeReason ? <UpgradePlanCallout upgradeReason={upgradeReason} className="mt-4" /> : null}
    </form>
  );
}
