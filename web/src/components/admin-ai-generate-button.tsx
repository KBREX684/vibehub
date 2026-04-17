"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import type { AdminAiSuggestionTargetValue } from "@/lib/types";

export function AdminAiGenerateButton({
  targetType,
  targetId,
  task,
  label = "Generate AI suggestion",
  className = "btn btn-ghost text-xs px-3 py-1.5",
}: {
  targetType: AdminAiSuggestionTargetValue;
  targetId: string;
  task: "summarize_report" | "triage_post" | "verify_enterprise";
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch("/api/v1/admin/ai-suggestions/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType, targetId, task }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        setError(json?.error?.message ?? "Failed to generate AI suggestion");
        return;
      }
      router.refresh();
    } catch {
      setError("Failed to generate AI suggestion");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" className={className} disabled={busy} onClick={() => void generate()}>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          {busy ? "Generating..." : label}
        </span>
      </button>
      {error ? <p className="text-xs text-[var(--color-error)] m-0">{error}</p> : null}
    </div>
  );
}
