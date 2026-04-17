"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface TiltedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxTilt?: number;
}

export function TiltedCard({ children, className = "", maxTilt = 6, style, ...rest }: TiltedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    setEnabled(!reduced && !mobile);
  }, []);

  const reset = useCallback(() => setRotation({ x: 0, y: 0 }), []);

  const onMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      setRotation({
        x: (0.5 - y) * maxTilt,
        y: (x - 0.5) * maxTilt,
      });
    },
    [enabled, maxTilt]
  );

  return (
    <div
      ref={ref}
      className={["will-change-transform", className].join(" ")}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{
        transform: enabled
          ? `perspective(1200px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
          : undefined,
        transition: "transform 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
