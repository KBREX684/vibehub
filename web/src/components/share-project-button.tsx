"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

interface Props {
  url: string;
  title: string;
}

export function ShareProjectButton({ url, title }: Props) {
  const [hint, setHint] = useState<string | null>(null);

  async function onClick() {
    setHint(null);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setHint("Link copied");
      setTimeout(() => setHint(null), 2500);
    } catch {
      setHint("Could not copy link");
      setTimeout(() => setHint(null), 2500);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button type="button" className="btn btn-ghost text-sm px-3 py-2 flex items-center gap-1.5" onClick={onClick}>
        <Share2 className="w-3.5 h-3.5" />
        Share
      </button>
      {hint ? <span className="text-[10px] text-[var(--color-text-muted)]">{hint}</span> : null}
    </span>
  );
}
