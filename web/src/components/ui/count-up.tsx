"use client";

import { useEffect, useRef, useState } from "react";

export interface CountUpProps {
  /** Target number */
  end: number;
  /** Start number. Defaults to 0 */
  start?: number;
  /** Duration in ms. Defaults to 1500 */
  duration?: number;
  /** Prefix text (e.g. "¥") */
  prefix?: string;
  /** Suffix text (e.g. "+") */
  suffix?: string;
  /** Number of decimal places. Defaults to 0 */
  decimals?: number;
  /** Extra CSS classes */
  className?: string;
  /** Trigger on viewport entry. Defaults to true */
  triggerOnView?: boolean;
}

/**
 * CountUp — animated number counter.
 * Inspired by reactbits.dev/CountUp.
 * Uses requestAnimationFrame for smooth interpolation.
 * Respects prefers-reduced-motion.
 */
export function CountUp({
  end,
  start = 0,
  duration = 1500,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
  triggerOnView = true,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(start);
  const [triggered, setTriggered] = useState(!triggerOnView);

  useEffect(() => {
    if (!triggerOnView) return;
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setValue(end);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [triggerOnView, end]);

  useEffect(() => {
    if (!triggered) return;
    const startTime = performance.now();
    let raf: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      /* ease-out cubic */
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + (end - start) * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [triggered, start, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
