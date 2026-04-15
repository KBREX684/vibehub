"use client";

/**
 * P4-FE-1: Lightweight Core Web Vitals collection.
 *
 * Collects LCP, CLS, and INP using the native PerformanceObserver API
 * (no external dependencies). Metrics are logged to console in development
 * and sent to /api/v1/telemetry/web-vitals in production via sendBeacon.
 */

interface WebVitalMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  id: string;
  navigationType: string;
}

function ratingForLCP(ms: number): WebVitalMetric["rating"] {
  if (ms <= 2500) return "good";
  if (ms <= 4000) return "needs-improvement";
  return "poor";
}

function ratingForCLS(score: number): WebVitalMetric["rating"] {
  if (score <= 0.1) return "good";
  if (score <= 0.25) return "needs-improvement";
  return "poor";
}

function ratingForINP(ms: number): WebVitalMetric["rating"] {
  if (ms <= 200) return "good";
  if (ms <= 500) return "needs-improvement";
  return "poor";
}

let vitalsId = 0;
function nextId(): string {
  return `v${++vitalsId}-${Date.now().toString(36)}`;
}

function getNavigationType(): string {
  if (typeof performance === "undefined") return "unknown";
  const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return entries[0]?.type ?? "unknown";
}

function report(metric: WebVitalMetric) {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[web-vitals] ${metric.name}: ${metric.value.toFixed(1)}`);
  }

  if (process.env.NODE_ENV === "production" && navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/v1/telemetry/web-vitals",
      JSON.stringify(metric),
    );
  }
}

function observeLCP() {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        report({
          name: "LCP",
          value: last.startTime,
          rating: ratingForLCP(last.startTime),
          id: nextId(),
          navigationType: getNavigationType(),
        });
      }
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // PerformanceObserver not supported
  }
}

function observeCLS() {
  try {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(entry as any).hadRecentInput) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          clsValue += (entry as any).value ?? 0;
        }
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });

    // Report CLS on page hide (final value)
    const onHidden = () => {
      report({
        name: "CLS",
        value: clsValue,
        rating: ratingForCLS(clsValue),
        id: nextId(),
        navigationType: getNavigationType(),
      });
      removeEventListener("visibilitychange", onVisChange);
      removeEventListener("pagehide", onHidden);
    };
    const onVisChange = () => {
      if (document.visibilityState === "hidden") onHidden();
    };
    addEventListener("visibilitychange", onVisChange);
    addEventListener("pagehide", onHidden);
  } catch {
    // PerformanceObserver not supported
  }
}

function observeINP() {
  try {
    let maxDuration = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = entry.duration;
        if (duration > maxDuration) maxDuration = duration;
      }
    });
    observer.observe({ type: "event", buffered: true });

    const onHidden = () => {
      if (maxDuration > 0) {
        report({
          name: "INP",
          value: maxDuration,
          rating: ratingForINP(maxDuration),
          id: nextId(),
          navigationType: getNavigationType(),
        });
      }
      removeEventListener("visibilitychange", onVisChange);
      removeEventListener("pagehide", onHidden);
    };
    const onVisChange = () => {
      if (document.visibilityState === "hidden") onHidden();
    };
    addEventListener("visibilitychange", onVisChange);
    addEventListener("pagehide", onHidden);
  } catch {
    // PerformanceObserver not supported
  }
}

/** Call once from the root client component to start collecting Web Vitals. */
export function useWebVitalsReporter() {
  if (typeof window === "undefined") return;

  // Ensure observers are only registered once per page load
  if ((window as Record<string, unknown>).__WEB_VITALS_INIT__) return;
  (window as Record<string, unknown>).__WEB_VITALS_INIT__ = true;

  observeLCP();
  observeCLS();
  observeINP();
}
