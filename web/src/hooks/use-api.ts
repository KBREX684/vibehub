"use client";

import useSWR from "swr";

/**
 * P4-FE-2: Reusable SWR data-fetching hooks.
 *
 * Each hook wraps `useSWR` for a specific API resource so that components
 * get automatic request deduplication, caching, and background revalidation
 * without any extra boilerplate.
 */

/* ------------------------------------------------------------------ */
/*  Current user                                                       */
/* ------------------------------------------------------------------ */

/** Fetch the authenticated user's profile. */
export function useMyProfile() {
  const { data, error, isLoading, mutate } = useSWR("/api/v1/me/profile");
  return {
    profile: data?.data ?? null,
    isLoading,
    error,
    mutate,
  };
}

/** Fetch the authenticated user's notifications. */
export function useNotifications(limit = 20) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/v1/me/notifications?limit=${limit}`,
  );
  return {
    notifications: data?.data?.items ?? [],
    unreadCount: data?.data?.unreadCount ?? 0,
    isLoading,
    error,
    mutate,
  };
}

/** Fetch the authenticated user's API keys. */
export function useApiKeys() {
  const { data, error, isLoading, mutate } = useSWR("/api/v1/me/api-keys");
  return {
    apiKeys: data?.data?.items ?? [],
    isLoading,
    error,
    mutate,
  };
}

/* ------------------------------------------------------------------ */
/*  Public resources                                                   */
/* ------------------------------------------------------------------ */

/** Fetch a project by slug (pass `null` to skip). */
export function useProject(slug: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? `/api/v1/projects/${encodeURIComponent(slug)}` : null,
  );
  return {
    project: data?.data ?? null,
    isLoading,
    error,
    mutate,
  };
}

/** Fetch a team by slug (pass `null` to skip). */
export function useTeam(slug: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? `/api/v1/teams/${encodeURIComponent(slug)}` : null,
  );
  return {
    team: data?.data ?? null,
    isLoading,
    error,
    mutate,
  };
}

/** Fetch a discussion by slug (pass `null` to skip). */
export function useDiscussion(slug: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? `/api/v1/discussions/${encodeURIComponent(slug)}` : null,
  );
  return {
    discussion: data?.data ?? null,
    isLoading,
    error,
    mutate,
  };
}

/* ------------------------------------------------------------------ */
/*  Generic helper                                                     */
/* ------------------------------------------------------------------ */

/** Generic hook – pass any API URL (or `null` to skip the request). */
export function useApi<T = unknown>(url: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ data: T }>(url);
  return {
    data: data?.data ?? null,
    isLoading,
    error,
    mutate,
  };
}
