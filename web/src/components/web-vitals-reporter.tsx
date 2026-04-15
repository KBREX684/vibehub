"use client";

import { useWebVitalsReporter } from "@/hooks/use-web-vitals";

/** Invisible component that starts Core Web Vitals collection on mount. */
export function WebVitalsReporter() {
  useWebVitalsReporter();
  return null;
}
