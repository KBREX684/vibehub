"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import type { ProjectStatus } from "@/lib/types";
import type { UpgradeReason } from "@/lib/subscription";
import { UpgradePlanCallout } from "@/components/upgrade-plan-callout";
import { apiFetch } from "@/lib/api-fetch";

const STATUSES: ProjectStatus[] = ["idea", "building", "launched", "paused"];

function parseList(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CreateProjectForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [description, setDescription] = useState("");
  const [readmeMarkdown, setReadmeMarkdown] = useState("");
  const [techStackInput, setTechStackInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("idea");
  const [demoUrl, setDemoUrl] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | undefined>(undefined);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  async function submitProject() {
    setFormStatus("loading");
    setMessage(null);
    setUpgradeReason(undefined);
    const techStack = parseList(techStackInput);
    const tags = parseList(tagsInput);
    const body: Record<string, unknown> = {
      title: title.trim(),
      oneLiner: oneLiner.trim(),
      description: description.trim(),
      techStack,
      tags,
      status,
    };
    const rm = readmeMarkdown.trim();
    if (rm) body.readmeMarkdown = rm;
    const d = demoUrl.trim();
    if (d) body.demoUrl = d;

    try {
      const res = await apiFetch("/api/v1/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        data?: { slug?: string };
        error?: { message?: string; code?: string; details?: { upgradeReason?: UpgradeReason } };
      };
      if (!res.ok || !json.data?.slug) {
        setFormStatus("error");
        setMessage(json.error?.message ?? t("project.form.create.failed"));
        setUpgradeReason(json.error?.details?.upgradeReason);
        return;
      }
      window.location.assign(`/projects/${encodeURIComponent(json.data.slug)}`);
    } catch (err) {
      setFormStatus("error");
      setMessage(err instanceof Error ? err.message : t("project.form.create.failed"));
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submitProject();
  }

  const formDisabled = !isHydrated || formStatus === "loading";

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="project-new-title" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          {t("project.form.create.titleLabel")} <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="project-new-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-base"
          disabled={formDisabled}
          required
          minLength={3}
          maxLength={120}
          placeholder={t("project.form.create.titlePlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="project-new-one-liner" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          {t("project.form.create.oneLinerLabel")} <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="project-new-one-liner"
          value={oneLiner}
          onChange={(e) => setOneLiner(e.target.value)}
          className="input-base"
          disabled={formDisabled}
          required
          minLength={5}
          maxLength={200}
          placeholder={t("project.form.create.oneLinerPlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="project-new-description" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          {t("project.form.create.descriptionLabel")} <span className="text-[var(--color-error)]">*</span>
        </label>
        <textarea
          id="project-new-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-base resize-y min-h-[140px]"
          disabled={formDisabled}
          required
          minLength={20}
          rows={6}
          placeholder={t("project.form.create.descriptionPlaceholder")}
        />
        <p className="text-[10px] text-[var(--color-text-muted)]">
          {t("project.form.create.descriptionCount").replace("{count}", String(description.length))}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="project-new-readme" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          {t("project.form.create.readmeLabel")}
        </label>
        <textarea
          id="project-new-readme"
          value={readmeMarkdown}
          onChange={(e) => setReadmeMarkdown(e.target.value)}
          className="input-base resize-y min-h-[120px] font-mono text-xs"
          disabled={formDisabled}
          rows={5}
          placeholder={t("project.form.create.readmePlaceholder")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">{t("project.form.create.statusLabel")}</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="input-base appearance-none cursor-pointer"
            disabled={formDisabled}
          >
            {STATUSES.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {t(`project.status.${statusValue}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">{t("project.form.create.demoUrlLabel")}</label>
          <input
            value={demoUrl}
            onChange={(e) => setDemoUrl(e.target.value)}
            className="input-base"
            type="url"
            disabled={formDisabled}
            placeholder={t("project.form.create.demoUrlPlaceholder")}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">{t("project.form.create.techStackLabel")}</label>
        <textarea
          value={techStackInput}
          onChange={(e) => setTechStackInput(e.target.value)}
          className="input-base resize-none"
          disabled={formDisabled}
          rows={2}
          placeholder={t("project.form.create.techStackPlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">{t("project.form.create.tagsLabel")}</label>
        <textarea
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className="input-base resize-none"
          disabled={formDisabled}
          rows={2}
          placeholder={t("project.form.create.tagsPlaceholder")}
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          className="btn btn-primary text-sm px-5 py-2"
          disabled={formDisabled}
          onClick={() => void submitProject()}
        >
          {formStatus === "loading" ? t("project.form.create.submitting") : t("project.form.create.submit")}
        </button>
        <button type="button" className="btn btn-secondary text-sm px-5 py-2" onClick={() => router.back()}>
          {t("project.form.create.cancel")}
        </button>
      </div>

      {message ? <p className="text-sm text-[var(--color-error)] m-0">{message}</p> : null}
      {upgradeReason ? <UpgradePlanCallout upgradeReason={upgradeReason} /> : null}
    </form>
  );
}
