"use client";

import { Float } from "@/components/ui/float";

export function FloatingIcon({ children }: { children: React.ReactNode }) {
  return (
    <Float distance={5} speed={3}>
      {children}
    </Float>
  );
}
