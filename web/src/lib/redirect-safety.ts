/**
 * Same-origin relative path only — prevents open redirects via //evil, /\evil, or protocol injection.
 */
export function sanitizeSameOriginRedirectPath(value: string | null | undefined, defaultPath = "/"): string {
  if (!value) {
    return defaultPath;
  }
  let t = value.trim();
  try {
    t = decodeURIComponent(t);
  } catch {
    return defaultPath;
  }
  t = t.trim();
  if (!t.startsWith("/") || t.startsWith("//")) {
    return defaultPath;
  }
  if (t.includes("://") || t.includes("\\")) {
    return defaultPath;
  }
  return t;
}
