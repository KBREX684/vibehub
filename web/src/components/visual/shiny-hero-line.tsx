"use client";

import { ShinyText } from "@/components/ui";

export interface ShinyHeroLineProps {
  text: string;
  className?: string;
}

export function ShinyHeroLine({ text, className = "" }: ShinyHeroLineProps) {
  return (
    <span className={["relative inline-block align-top", className].join(" ")}>
      <span className="relative z-[1] text-[var(--color-text-primary)]">{text}</span>
      <ShinyText
        speed={6.5}
        className="pointer-events-none absolute inset-0 z-[2] opacity-80"
        aria-hidden="true"
        style={
          {
            "--shiny-color-start": "var(--color-text-secondary)",
            "--shiny-color-mid": "var(--color-text-primary)",
            "--shiny-color-end": "var(--color-text-secondary)",
          } as React.CSSProperties
        }
      >
        {text}
      </ShinyText>
    </span>
  );
}
