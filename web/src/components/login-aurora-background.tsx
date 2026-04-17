"use client";

import { Aurora } from "@/components/ui";

/**
 * Subtle aurora background for the login/signup page.
 * Rendered as a client component since Aurora uses useEffect.
 */
export function LoginAuroraBackground() {
  return (
    <Aurora
      opacity={0.15}
      speed={0.5}
      className="fixed inset-0"
    />
  );
}
