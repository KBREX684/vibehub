"use client";

import { useState } from "react";
import { MarkdownDocument } from "@/components/markdown-document";
import { useLanguage } from "@/app/context/LanguageContext";

export function DiscussionBodyField({
  body,
  onChange,
}: {
  body: string;
  onChange: (v: string) => void;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"write" | "preview">("write");

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Content <span className="text-[var(--color-error)]">*</span>
        </label>
        <div className="flex rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden text-xs">
          <button
            type="button"
            className={`px-2.5 py-1 ${mode === "write" ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}
            onClick={() => setMode("write")}
          >
            {t("discussions.new.write", "Write")}
          </button>
          <button
            type="button"
            className={`px-2.5 py-1 border-l border-[var(--color-border)] ${mode === "preview" ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}
            onClick={() => setMode("preview")}
          >
            {t("discussions.new.preview", "Preview")}
          </button>
        </div>
      </div>
      <textarea
        value={body}
        onChange={(e) => onChange(e.target.value)}
        className={
          mode === "write"
            ? "input-base resize-none"
            : "sr-only absolute w-px h-px p-0 -m-px overflow-hidden border-0"
        }
        placeholder="Share your thoughts, questions, or insights…"
        rows={8}
        maxLength={50000}
        required
        minLength={10}
        aria-hidden={mode === "preview"}
      />
      {mode === "preview" ? (
        <div className="input-base min-h-[200px] overflow-y-auto" aria-hidden>
          {body.trim() ? <MarkdownDocument markdown={body} /> : (
            <p className="text-sm text-[var(--color-text-muted)] m-0">{t("discussions.new.preview", "Preview")}</p>
          )}
        </div>
      ) : null}
      <p className="text-[10px] text-[var(--color-text-muted)]">{body.length}/50 000</p>
    </div>
  );
}
