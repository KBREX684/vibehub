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
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);

    if (!triggerOnView) {
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    /* Respect reduced-motion: show immediately */
    if (mq.matches) {
      setVisible(true);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.92 && rect.bottom >= 0) {
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
      { threshold: 0.05, rootMargin: "0px 0px -8% 0px" }
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
            opacity: triggerOnView ? (visible ? 1 : 0) : 1,
            transform: triggerOnView ? (visible ? "translateY(0)" : "translateY(12px)") : undefined,
            filter: triggerOnView ? (visible ? "blur(0px)" : "blur(4px)") : undefined,
            transitionDelay: triggerOnView ? `${i * delay}ms` : undefined,
            animation:
              !triggerOnView && !reducedMotion
                ? "split-word-in 520ms cubic-bezier(0.16, 1, 0.3, 1) both"
                : undefined,
            animationDelay: !triggerOnView && !reducedMotion ? `${i * delay}ms` : undefined,
          }}
        >
          {word}
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}
