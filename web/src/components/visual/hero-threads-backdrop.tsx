"use client";

import { useEffect, useRef } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

interface ThreadNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface HeroThreadsBackdropProps {
  className?: string;
}

export function HeroThreadsBackdrop({ className = "" }: HeroThreadsBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rootStyles = getComputedStyle(document.documentElement);
    const lineColor =
      rootStyles.getPropertyValue("--color-text-tertiary").trim() ||
      rootStyles.getPropertyValue("--color-border-strong").trim() ||
      rootStyles.getPropertyValue("--color-border").trim();
    const glowColor =
      rootStyles.getPropertyValue("--color-text-secondary").trim() ||
      rootStyles.getPropertyValue("--color-text-tertiary").trim();
    const nodeColor =
      rootStyles.getPropertyValue("--color-text-primary").trim() ||
      rootStyles.getPropertyValue("--color-text-secondary").trim();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 767px)");

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes: ThreadNode[] = [];

    const buildNodes = () => {
      const densityDivisor = mobile.matches ? 42000 : 24000;
      const count = clamp(Math.round((width * height) / densityDivisor), 14, mobile.matches ? 20 : 30);
      const speedScale = mobile.matches ? 0.22 : 0.38;
      nodes = Array.from({ length: count }, (_, index) => {
        const seed = index + 1;
        const rand = (offset: number) => {
          const value = Math.sin(seed * 93 + offset * 31) * 10000;
          return value - Math.floor(value);
        };

        return {
          x: rand(1) * width,
          y: rand(2) * height,
          vx: (rand(3) - 0.5) * speedScale,
          vy: (rand(4) - 0.5) * speedScale,
        };
      });
    };

    const resize = () => {
      width = parent.clientWidth;
      height = parent.clientHeight;
      dpr = clamp(window.devicePixelRatio || 1, 1, 1.5);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNodes();
      drawFrame(false);
    };

    const drawFrame = (animate: boolean) => {
      ctx.clearRect(0, 0, width, height);

      const maxDistance = Math.min(220, width * 0.24);
      const glowDistance = maxDistance * 0.55;

      if (animate) {
        for (const node of nodes) {
          node.x += node.vx;
          node.y += node.vy;

          if (node.x <= -20 || node.x >= width + 20) node.vx *= -1;
          if (node.y <= -20 || node.y >= height + 20) node.vy *= -1;
        }
      }

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);
          if (distance > maxDistance) continue;

          const alpha = (1 - distance / maxDistance) * (mobile.matches ? 0.2 : 0.34);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = distance < glowDistance ? glowColor : lineColor;
          ctx.lineWidth = distance < glowDistance ? 1.2 : 0.9;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const node of nodes) {
        ctx.globalAlpha = mobile.matches ? 0.28 : 0.4;
        ctx.fillStyle = nodeColor;
        ctx.beginPath();
        ctx.arc(node.x, node.y, mobile.matches ? 1.2 : 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    const tick = () => {
      if (!reducedMotion.matches) {
        drawFrame(true);
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const onPreferenceChange = () => {
      window.cancelAnimationFrame(animationFrame);
      resize();
      if (!reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
    reducedMotion.addEventListener("change", onPreferenceChange);
    mobile.addEventListener("change", onPreferenceChange);

    resize();
    if (!reducedMotion.matches) {
      animationFrame = window.requestAnimationFrame(tick);
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      reducedMotion.removeEventListener("change", onPreferenceChange);
      mobile.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]",
        className,
      ].join(" ")}
    >
      <div
        className="absolute left-[8%] top-[10%] h-40 w-40 rounded-full blur-3xl opacity-30"
        style={{ background: "var(--color-accent-cyan-subtle)" }}
      />
      <div
        className="absolute right-[10%] top-[18%] h-44 w-44 rounded-full blur-3xl opacity-25"
        style={{ background: "var(--color-accent-violet-subtle)" }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-85" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-[color:var(--color-bg-canvas)]/35 to-[var(--color-bg-canvas)]" />
    </div>
  );
}
