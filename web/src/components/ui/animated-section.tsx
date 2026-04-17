"use client";

import React, { useEffect, useRef, useState } from "react";

type HtmlTag = keyof HTMLElementTagNameMap;

export interface AnimatedSectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  as?: HtmlTag;
  delayMs?: number;
}

export function AnimatedSection({
  children,
  className = "",
  as = "section",
  delayMs = 0,
  style,
  ...props
}: AnimatedSectionProps) {
  const Component = as as keyof React.JSX.IntrinsicElements;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(true);
      return;
    }
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.92 && rect.bottom >= 0) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return React.createElement(
    Component,
    {
      ...props,
      ref,
      className,
      style: {
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition: `opacity 520ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, transform 520ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
      },
    },
    children
  );
}
