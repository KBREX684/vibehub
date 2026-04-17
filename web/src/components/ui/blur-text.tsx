"use client";

import React, { useEffect, useRef, useState } from "react";

type HtmlTag = keyof HTMLElementTagNameMap;

export interface BlurTextProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  as?: HtmlTag;
  delayMs?: number;
}

export function BlurText({
  children,
  className = "",
  as = "div",
  delayMs = 0,
  style,
  ...props
}: BlurTextProps) {
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
        filter: visible ? "blur(0px)" : "blur(10px)",
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: `opacity 420ms ease ${delayMs}ms, filter 420ms ease ${delayMs}ms, transform 420ms ease ${delayMs}ms`,
      },
    },
    children
  );
}
