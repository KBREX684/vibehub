"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectStatus } from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "building", label: "Building" },
  { value: "launched", label: "Launched" },
  { value: "paused", label: "Paused" },
];

function joinList(items: string[]): string {
  return items.join(", ");
}

function parseList(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface Props {
  project: Project;
}

export function EditProjectForm({ project }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [oneLiner, setOneLiner] = useState(project.oneLiner);
  const [description, setDescription] = useState(project.description);
  const [readmeMarkdown, setReadmeMarkdown] = useState(project.readmeMarkdown ?? "");
  const [techStackInput, setTechStackInput] = useState(joinList(project.techStack));
  const [tagsInput, setTagsInput] = useState(joinList(project.tags));
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [demoUrl, setDemoUrl] = useState(project.demoUrl ?? "");
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormStatus("loading");
    setMessage(null);
    const techStack = parseList(techStackInput);
    const tags = parseList(tagsInput);
    const body: Record<string, unknown> = {
      title: title.trim(),
      oneLiner: oneLiner.trim(),
      description: description.trim(),
      techStack,
      tags,
      status,
      demoUrl: demoUrl.trim() === "" ? null : demoUrl.trim(),
      readmeMarkdown: readmeMarkdown.trim() === "" ? null : readmeMarkdown.trim(),
    };

    try {
      const res = await apiFetch(`/api/v1/projects/${encodeURIComponent(project.slug)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { data?: { slug?: string }; error?: { message?: string } };
      if (!res.ok) {
        setFormStatus("error");
        setMessage(json.error?.message ?? "Update failed");
        return;
      }
      const nextSlug = json.data?.slug ?? project.slug;
      router.push(`/projects/${encodeURIComponent(nextSlug)}`);
      router.refresh();
    } catch (err) {
      setFormStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-5">
      <p className="text-xs text-[var(--color-text-muted)] m-0">
        Slug <span className="font-mono text-[var(--color-text-secondary)]">{project.slug}</span> is generated when the
        project is created and cannot be changed here.
      </p>

      <div className="space-y-1.5">
        <label htmlFor="project-edit-title" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Title <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="project-edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-base"
          required
          minLength={3}
          maxLength={120}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="project-edit-one-liner" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          One-liner <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="project-edit-one-liner"
          value={oneLiner}
          onChange={(e) => setOneLiner(e.target.value)}
          className="input-base"
          required
          minLength={5}
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="project-edit-description" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Description <span className="text-[var(--color-error)]">*</span>
        </label>
        <textarea
          id="project-edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-base resize-y min-h-[140px]"
          required
          minLength={20}
          rows={6}
        />
        <p className="text-[10px] text-[var(--color-text-muted)]">{description.length} characters (min 20)</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="project-edit-readme" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          README (Markdown, optional)
        </label>
        <textarea
          id="project-edit-readme"
          value={readmeMarkdown}
          onChange={(e) => setReadmeMarkdown(e.target.value)}
          className="input-base resize-y min-h-[120px] font-mono text-xs"
          rows={5}
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
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Demo URL</label>
          <input
            value={demoUrl}
            onChange={(e) => setDemoUrl(e.target.value)}
            className="input-base"
            type="url"
            placeholder="Clear to remove"
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
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Tags</label>
        <textarea
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className="input-base resize-none"
          rows={2}
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" className="btn btn-primary text-sm px-5 py-2" disabled={formStatus === "loading"}>
          {formStatus === "loading" ? "Saving…" : "Save changes"}
        </button>
        <button type="button" className="btn btn-secondary text-sm px-5 py-2" onClick={() => router.back()}>
          Cancel
        </button>
      </div>

      {message ? <p className="text-sm text-[var(--color-error)] m-0">{message}</p> : null}
    </form>
  );
}
