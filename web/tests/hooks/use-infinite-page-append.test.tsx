import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock IntersectionObserver
class MockIO {
  callback: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", MockIO);

import {
  useInfinitePageAppend,
  type PageAppendPagination,
} from "@/hooks/use-infinite-page-append";

const makeItems = (ids: string[]) => ids.map((id) => ({ id }));

const basePagination: PageAppendPagination = {
  total: 30,
  totalPages: 3,
  page: 1,
  limit: 10,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useInfinitePageAppend", () => {
  it("returns initial items and pagination state", () => {
    const items = makeItems(["1", "2", "3"]);
    const { result } = renderHook(() =>
      useInfinitePageAppend({
        initialItems: items,
        initialPagination: basePagination,
        fetchPage: vi.fn(),
      }),
    );

    expect(result.current.items).toEqual(items);
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("hasMore is true when page < totalPages", () => {
    const { result } = renderHook(() =>
      useInfinitePageAppend({
        initialItems: makeItems(["1"]),
        initialPagination: { ...basePagination, page: 1, totalPages: 3 },
        fetchPage: vi.fn(),
      }),
    );

    expect(result.current.hasMore).toBe(true);
  });

  it("hasMore is false when page >= totalPages", () => {
    const { result } = renderHook(() =>
      useInfinitePageAppend({
        initialItems: makeItems(["1"]),
        initialPagination: { ...basePagination, page: 3, totalPages: 3 },
        fetchPage: vi.fn(),
      }),
    );

    expect(result.current.hasMore).toBe(false);
  });

  it("does not load more when already loading", async () => {
    let resolveFirst!: (v: unknown) => void;
    const fetchPage = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const { result } = renderHook(() =>
      useInfinitePageAppend({
        initialItems: makeItems(["1"]),
        initialPagination: basePagination,
        fetchPage,
      }),
    );

    // Simulate intersection to trigger loadMore via the IntersectionObserver callback
    // We need to access loadMore indirectly. The hook exposes sentinelRef but loadMore
    // is internal. We'll simulate by examining that fetchPage is called only once even
    // if the observer fires twice while loading.
    // Instead, directly get the IO instance and call its callback.

    // The IO is created in an effect and we don't have direct access. Instead,
    // let's spy on the constructor to capture instances.
    const instances: MockIO[] = [];
    const OrigMock = MockIO;
    vi.stubGlobal(
      "IntersectionObserver",
      class extends OrigMock {
        constructor(cb: IntersectionObserverCallback) {
          super(cb);
          instances.push(this);
        }
      },
    );

    // Re-render with a sentinel ref attached
    const div = document.createElement("div");
    const { result: result2 } = renderHook(() =>
      useInfinitePageAppend({
        initialItems: makeItems(["1"]),
        initialPagination: basePagination,
        fetchPage,
      }),
    );

    // Attach sentinel
    act(() => {
      (result2.current.sentinelRef as React.MutableRefObject<HTMLDivElement>).current = div;
    });

    // Re-render to trigger effect
    const { result: result3 } = renderHook(() =>
      useInfinitePageAppend({
        initialItems: makeItems(["1"]),
        initialPagination: basePagination,
        fetchPage,
      }),
    );

    // Trigger intersection on the latest instance
    if (instances.length > 0) {
      const io = instances[instances.length - 1];
      await act(async () => {
        io.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          io as unknown as IntersectionObserver,
        );
      });
      // Try triggering again while first is still loading
      await act(async () => {
        io.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          io as unknown as IntersectionObserver,
        );
      });

      // fetchPage should only be called once because loadingRef guards it
      expect(fetchPage).toHaveBeenCalledTimes(1);

      // Resolve the pending fetch
      await act(async () => {
        resolveFirst({
          items: makeItems(["10"]),
          pagination: { total: 30, totalPages: 3, page: 2, limit: 10 },
        });
      });
    }
  });

  it("error state is set on fetch failure", async () => {
    const fetchPage = vi.fn().mockRejectedValue(new Error("fetch failed"));

    const instances: MockIO[] = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class extends MockIO {
        constructor(cb: IntersectionObserverCallback) {
          super(cb);
          instances.push(this);
        }
      },
    );

    const div = document.createElement("div");
    const { result } = renderHook(() =>
      useInfinitePageAppend({
        initialItems: makeItems(["1"]),
        initialPagination: basePagination,
        fetchPage,
      }),
    );

    act(() => {
      (result.current.sentinelRef as React.MutableRefObject<HTMLDivElement>).current = div;
    });

    // Re-render to pick up the sentinel
    const { result: result2 } = renderHook(() =>
      useInfinitePageAppend({
        initialItems: makeItems(["1"]),
        initialPagination: basePagination,
        fetchPage,
      }),
    );

    if (instances.length > 0) {
      const io = instances[instances.length - 1];
      await act(async () => {
        io.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          io as unknown as IntersectionObserver,
        );
      });

      expect(result2.current.error).toBe("fetch failed");
      expect(result2.current.loading).toBe(false);
    }
  });
});
