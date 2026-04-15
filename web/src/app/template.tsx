import type { ReactNode } from "react";

/**
 * P4-FE-1: avoid wrapping every route in a client Framer Motion boundary.
 * Page-level motion can be added selectively where it improves UX.
 */
export default function Template({ children }: { children: ReactNode }) {
  return children;
}
