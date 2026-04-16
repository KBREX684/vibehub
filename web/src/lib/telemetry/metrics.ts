/**
 * P4-BE-1: Lightweight in-memory metrics collector.
 * No external dependencies — uses simple Map-based counters and histograms.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RequestMetric {
  count: number;
  totalDurationMs: number;
  /** Histogram buckets (ms): ≤50, ≤100, ≤250, ≤500, ≤1000, >1000 */
  histogram: [number, number, number, number, number, number];
}

export interface MetricsSnapshot {
  startedAt: string;
  requests: Record<string, RequestMetric>;
  errors: Record<number, number>;
  businessEvents: Record<string, number>;
}

export type BusinessEvent =
  | "user.login"
  | "project.create"
  | "team.create"
  | "api_key.create"
  | "post.create";

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const startedAt = new Date().toISOString();

/** key = `METHOD route` e.g. "GET /api/v1/health" */
const requestMetrics = new Map<string, RequestMetric>();

/** key = HTTP status code */
const errorCounts = new Map<number, number>();

/** key = event name */
const businessEventCounts = new Map<string, number>();

// ---------------------------------------------------------------------------
// Histogram helpers
// ---------------------------------------------------------------------------

const HISTOGRAM_BOUNDARIES = [50, 100, 250, 500, 1000] as const;

function histogramBucketIndex(durationMs: number): number {
  for (let i = 0; i < HISTOGRAM_BOUNDARIES.length; i++) {
    if (durationMs <= HISTOGRAM_BOUNDARIES[i]) return i;
  }
  return HISTOGRAM_BOUNDARIES.length; // >1000
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function recordRequest(
  route: string,
  method: string,
  statusCode: number,
  durationMs: number,
): void {
  const key = `${method} ${route}`;

  let metric = requestMetrics.get(key);
  if (!metric) {
    metric = { count: 0, totalDurationMs: 0, histogram: [0, 0, 0, 0, 0, 0] };
    requestMetrics.set(key, metric);
  }

  metric.count += 1;
  metric.totalDurationMs += durationMs;
  metric.histogram[histogramBucketIndex(durationMs)] += 1;

  if (statusCode >= 400) {
    errorCounts.set(statusCode, (errorCounts.get(statusCode) ?? 0) + 1);
  }
}

/** Record a business event. `meta` is reserved for future enrichment (e.g. structured logging). */
export function recordBusinessEvent(
  event: string,
  _meta?: Record<string, unknown>,
): void {
  businessEventCounts.set(event, (businessEventCounts.get(event) ?? 0) + 1);
}

export function getMetrics(): MetricsSnapshot {
  return {
    startedAt,
    requests: Object.fromEntries(requestMetrics),
    errors: Object.fromEntries(errorCounts),
    businessEvents: Object.fromEntries(businessEventCounts),
  };
}

/** Convenience: quick summary counts for the health endpoint. */
export function getMetricsSummary() {
  let totalRequests = 0;
  let totalErrors = 0;

  for (const m of requestMetrics.values()) {
    totalRequests += m.count;
  }
  for (const c of errorCounts.values()) {
    totalErrors += c;
  }

  return {
    totalRequests,
    totalErrors,
    totalBusinessEvents: [...businessEventCounts.values()].reduce(
      (a, b) => a + b,
      0,
    ),
    uniqueRoutes: requestMetrics.size,
  };
}
