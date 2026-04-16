import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Reset module-level webVitalsInit guard between tests
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useWebVitalsReporter", () => {
  it("does not throw in jsdom environment", async () => {
    const mod = await import("@/hooks/use-web-vitals");
    expect(() => mod.useWebVitalsReporter()).not.toThrow();
  });

  it("is idempotent (can be called multiple times)", async () => {
    const mod = await import("@/hooks/use-web-vitals");
    mod.useWebVitalsReporter();
    mod.useWebVitalsReporter();
    // No error thrown = pass
  });

  it("does nothing when window is undefined (SSR)", async () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error - simulating SSR by removing window
    delete globalThis.window;

    try {
      const mod = await import("@/hooks/use-web-vitals");
      expect(() => mod.useWebVitalsReporter()).not.toThrow();
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("sets up observers when PerformanceObserver is available", async () => {
    const observeSpy = vi.fn();
    const mockPO = vi.fn().mockImplementation(() => ({
      observe: observeSpy,
      disconnect: vi.fn(),
    }));
    vi.stubGlobal("PerformanceObserver", mockPO);

    const mod = await import("@/hooks/use-web-vitals");
    mod.useWebVitalsReporter();

    // Should have created observers for LCP, CLS, and INP
    expect(mockPO).toHaveBeenCalledTimes(3);
    expect(observeSpy).toHaveBeenCalledTimes(3);

    const observeArgs = observeSpy.mock.calls.map(
      (call: [{ type: string }]) => call[0].type,
    );
    expect(observeArgs).toContain("largest-contentful-paint");
    expect(observeArgs).toContain("layout-shift");
    expect(observeArgs).toContain("event");

    vi.unstubAllGlobals();
  });
});
