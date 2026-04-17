"use client";

import { useEffect, useRef, useState } from "react";

export interface SplitTextProps {
  /** The text to animate */
  text: string;
  /** CSS class applied to each word wrapper */
  className?: string;
  /** Delay between each word animation in ms. Defaults to 60 */
  delay?: number;
  /** Whether to trigger on viewport entry (IntersectionObserver). Defaults to true */
  triggerOnView?: boolean;
}

/**
 * SplitText — word-by-word staggered reveal animation.
 * Inspired by reactbits.dev/SplitText.
 * Uses IntersectionObserver + CSS transitions for performance.
 * Respects prefers-reduced-motion.
 */
export function SplitText({
  text,
  className = "",
  delay = 60,
  triggerOnView = true,
}: SplitTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(!triggerOnView);

  useEffect(() => {
    if (!triggerOnView) return;
    const el = containerRef.current;
    if (!el) return;

    /* Respect reduced-motion: show immediately */
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [triggerOnView]);

  const words = text.split(/\s+/);

  return (
    <span ref={containerRef} className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden="true"
          className="inline-block transition-all duration-500"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            filter: visible ? "blur(0px)" : "blur(4px)",
            transitionDelay: `${i * delay}ms`,
          }}
        >
          {word}
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}
