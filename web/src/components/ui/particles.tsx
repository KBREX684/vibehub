"use client";

import { useEffect, useMemo, useState } from "react";

export interface ParticlesProps {
  className?: string;
  color?: string;
  count?: number;
}

function createParticle(seed: number) {
  const rand = (offset: number) => {
    const value = Math.sin(seed * 97 + offset * 31) * 10000;
    return value - Math.floor(value);
  };

  return {
    left: `${Math.round(rand(1) * 100)}%`,
    top: `${Math.round(rand(2) * 100)}%`,
    size: 2 + Math.round(rand(3) * 3),
    duration: `${6 + Math.round(rand(4) * 8)}s`,
    delay: `${(rand(5) * 4).toFixed(2)}s`,
  };
}

export function Particles({ className = "", color = "var(--color-accent-cyan)", count = 18 }: ParticlesProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    setEnabled(!reduced && !mobile);
  }, []);

  const particles = useMemo(
    () => Array.from({ length: count }, (_, index) => createParticle(index + 1)),
    [count]
  );

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className={["particles-layer", className].join(" ")}>
      {particles.map((particle, index) => (
        <span
          key={`particle-${index}`}
          className="particles-dot"
          style={{
            left: particle.left,
            top: particle.top,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            ["--particle-delay" as string]: particle.delay,
            ["--particle-duration" as string]: particle.duration,
            ["--particle-color" as string]: color,
          }}
        />
      ))}
    </div>
  );
}
