"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

/**
 * P4-FE-2: Global SWR configuration for client-side data fetching.
 *
 * Provides a shared fetcher, request deduplication (5 s window), and
 * conservative retry behaviour so every `useSWR` call benefits from
 * caching and background revalidation out of the box.
 */

interface FetchError extends Error {
  status: number;
  info?: unknown;
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const err = new Error("Fetch failed") as FetchError;
    err.status = res.status;
    try {
      err.info = await res.json();
    } catch {
      /* ignore parse errors */
    }
    throw err;
  }
  return res.json();
};

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        dedupingInterval: 5000,
        errorRetryCount: 2,
        shouldRetryOnError: (err) => {
          const status = (err as FetchError).status;
          return status !== 401 && status !== 403 && status !== 404;
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
