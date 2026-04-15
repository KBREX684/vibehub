"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectStatus } from "@/lib/types";
import type { UpgradeReason } from "@/lib/subscription";
import { UpgradePlanCallout } from "@/components/upgrade-plan-callout";
import { apiFetch } from "@/lib/api-fetch";

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "building", label: "Building" },
  { value: "launched", label: "Launched" },
  { value: "paused", label: "Paused" },
];

function parseList(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CreateProjectForm() {
  const router = useRouter();
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
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
        setMessage(json.error?.message ?? "Could not create project");
        setUpgradeReason(json.error?.details?.upgradeReason);
        return;
      }
      router.push(`/projects/${encodeURIComponent(json.data.slug)}`);
      router.refresh();
    } catch (err) {
      setFormStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="project-new-title" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Title <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="project-new-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-base"
          required
          minLength={3}
          maxLength={120}
          placeholder="Ship-ready name"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="project-new-one-liner" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          One-liner <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="project-new-one-liner"
          value={oneLiner}
          onChange={(e) => setOneLiner(e.target.value)}
          className="input-base"
          required
          minLength={5}
          maxLength={200}
          placeholder="What it does in one sentence"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="project-new-description" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Description <span className="text-[var(--color-error)]">*</span>
        </label>
        <textarea
          id="project-new-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-base resize-y min-h-[140px]"
          required
          minLength={20}
          rows={6}
          placeholder="Problem, approach, stack, and what you want from collaborators (min 20 characters)."
        />
        <p className="text-[10px] text-[var(--color-text-muted)]">{description.length} characters (min 20)</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="project-new-readme" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          README (Markdown, optional)
        </label>
        <textarea
          id="project-new-readme"
          value={readmeMarkdown}
          onChange={(e) => setReadmeMarkdown(e.target.value)}
          className="input-base resize-y min-h-[120px] font-mono text-xs"
          rows={5}
          placeholder={"## Getting started\n```bash\nnpm install\n```"}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="input-base appearance-none cursor-pointer"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Demo URL (optional)</label>
          <input
            value={demoUrl}
            onChange={(e) => setDemoUrl(e.target.value)}
            className="input-base"
            type="url"
            placeholder="https://"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Tech stack</label>
        <textarea
          value={techStackInput}
          onChange={(e) => setTechStackInput(e.target.value)}
          className="input-base resize-none"
          rows={2}
          placeholder="Comma or newline separated, e.g. Next.js, PostgreSQL"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Tags</label>
        <textarea
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className="input-base resize-none"
          rows={2}
          placeholder="Comma or newline separated, e.g. agent, open-source"
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" className="btn btn-primary text-sm px-5 py-2" disabled={formStatus === "loading"}>
          {formStatus === "loading" ? "Creating…" : "Create project"}
        </button>
        <button type="button" className="btn btn-secondary text-sm px-5 py-2" onClick={() => router.back()}>
          Cancel
        </button>
      </div>

      {message ? <p className="text-sm text-[var(--color-error)] m-0">{message}</p> : null}
      {upgradeReason ? <UpgradePlanCallout upgradeReason={upgradeReason} /> : null}
    </form>
  );
}
