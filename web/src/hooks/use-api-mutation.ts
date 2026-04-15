"use client";

import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

/**
 * P4-FE-2: Lightweight mutation hook built on top of `apiFetch`.
 *
 * Handles loading / error state and CSRF token attachment automatically.
 * Pair with the SWR `mutate` returned by `useApi*` hooks to revalidate
 * after a successful mutation.
 */

interface MutationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useApiMutation<TInput = unknown, TOutput = unknown>(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE" = "POST",
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = useCallback(
    async (body?: TInput, options?: MutationOptions<TOutput>): Promise<TOutput | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(url, {
          method,
          headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          const msg =
            (json as Record<string, Record<string, string>>)?.error?.message ??
            `Request failed (${res.status})`;
          throw new Error(msg);
        }
        const json = await res.json();
        const result = (json as Record<string, unknown>).data as TOutput;
        options?.onSuccess?.(result);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        options?.onError?.(e instanceof Error ? e : new Error(msg));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [url, method],
  );

  return { trigger, loading, error };
}
