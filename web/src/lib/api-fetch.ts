"use client";

/**
 * Client-side fetch wrapper for /api/v1 mutating requests.
 *
 * Automatically attaches `X-CSRF-Token` for POST/PATCH/PUT/DELETE calls
 * that use cookie-based session auth, satisfying the CSRF double-submit
 * requirement added in P0-BE-2.
 *
 * The CSRF token is fetched once per page load and cached. If the user is
 * not authenticated (no session cookie), the header is omitted — the server
 * will reject the request as 401 before the CSRF check anyway.
 *
 * Usage: drop-in replacement for `fetch` for API mutations.
 *
 *   const res = await apiFetch("/api/v1/posts", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(payload),
 *   });
 */

let _csrfToken: string | null | undefined = undefined; // undefined = not yet fetched

async function loadCsrfToken(): Promise<string | null> {
  if (_csrfToken !== undefined) return _csrfToken;
  try {
    const res = await fetch("/api/v1/auth/csrf-token", { credentials: "include" });
    if (!res.ok) {
      _csrfToken = null;
      return null;
    }
    const json = (await res.json()) as { data?: { csrfToken?: string } };
    _csrfToken = json.data?.csrfToken ?? null;
  } catch {
    _csrfToken = null;
  }
  return _csrfToken;
}

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();

  if (WRITE_METHODS.has(method)) {
    const token = await loadCsrfToken();
    if (token) {
      init = {
        ...init,
        headers: {
          ...init.headers,
          "X-CSRF-Token": token,
        },
      };
    }
  }

  // Always send cookies for same-origin API calls
  if (init.credentials === undefined) {
    init = { ...init, credentials: "include" };
  }

  return fetch(input, init);
}

/** Resets the cached CSRF token (e.g. after login/logout). */
export function resetCsrfToken() {
  _csrfToken = undefined;
}
