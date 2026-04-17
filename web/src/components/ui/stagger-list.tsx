"use client";

import { useEffect, useRef, useState } from "react";

export interface StaggerListProps {
  children: React.ReactNode[];
  /** Delay between each child in ms. Defaults to 50 */
  delay?: number;
  /** Extra CSS classes on the wrapper */
  className?: string;
  /** Trigger on viewport entry. Defaults to true */
  triggerOnView?: boolean;
}

/**
 * StaggerList — children appear one-by-one with staggered delays.
 * Uses IntersectionObserver for lazy triggering.
 * Respects prefers-reduced-motion.
 */
export function StaggerList({
  children,
  delay = 50,
  className = "",
  triggerOnView = true,
}: StaggerListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!triggerOnView);

  useEffect(() => {
    if (!triggerOnView) return;
    const el = ref.current;
    if (!el) return;
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
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [triggerOnView]);

  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <div
          key={`stagger-${i}`}
          className="transition-all duration-500"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transitionDelay: `${i * delay}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
