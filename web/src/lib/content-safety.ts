/** P2-2: lightweight keyword gate for user-generated text (posts, comments). */

const DEFAULT_BLOCKED = [
  "<script",
  "javascript:",
  "onerror=",
  "onload=",
  "eval(",
  "document.cookie",
];

function loadExtraFromEnv(): string[] {
  const raw = process.env.CONTENT_SAFETY_BLOCKED?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const extraBlocked = loadExtraFromEnv();

export function assertContentSafeText(text: string, fieldLabel = "content"): void {
  const lower = text.toLowerCase();
  for (const token of [...DEFAULT_BLOCKED, ...extraBlocked]) {
    if (lower.includes(token.toLowerCase())) {
      throw new Error(`CONTENT_POLICY_VIOLATION:${fieldLabel}`);
    }
  }
}

const URL_PATTERN = /https?:\/\//gi;

/** P2-5: cap URLs in a single message (spam / phishing). */
export function assertUrlCountAtMost(text: string, maxUrls: number, fieldLabel = "content"): void {
  const matches = text.match(URL_PATTERN);
  const n = matches?.length ?? 0;
  if (n > maxUrls) {
    throw new Error(`URL_LIMIT_EXCEEDED:${fieldLabel}`);
  }
}

/** Escape HTML angle brackets before persisting plain text (team chat, etc.). */
export function escapeHtmlAngleBrackets(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escape for HTML text nodes and double-quoted attribute values (oEmbed snippets, etc.). */
export function escapeHtmlForEmbed(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
