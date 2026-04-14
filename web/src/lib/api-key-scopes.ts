import type { SessionUser } from "@/lib/types";

/** Minimum scope on every key (public read surfaces). */
export const API_KEY_SCOPE_READ_PUBLIC = "read:public" as const;

export const API_KEY_SCOPES = [
  API_KEY_SCOPE_READ_PUBLIC,
  "read:teams:self",
  "read:teams:list",
  "read:team:detail",
  "read:team:tasks",
  "read:team:milestones",
  "read:enterprise:workspace",
  "read:projects:list",
  "read:projects:detail",
  "read:creators:list",
  "read:creators:detail",
  "read:topics:list",
  "read:topics:detail",
  "read:posts:list",
  "read:posts:detail",
  "write:team:tasks",
  /** P2-2: MCP / HTTP write surfaces (opt-in; never in DEFAULT_API_KEY_SCOPES) */
  "write:posts",
  "write:projects",
  "write:intents",
  "write:teams",
  /** S4 aliases (same gates as write:posts / write:projects in MCP v2 invoke) */
  "write:mcp:v2:posts",
  "write:mcp:v2:projects",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

const SCOPE_SET = new Set<string>(API_KEY_SCOPES);

/** Default for new keys: public + common read surfaces (P4-2). */
export const DEFAULT_API_KEY_SCOPES: readonly ApiKeyScope[] = [
  API_KEY_SCOPE_READ_PUBLIC,
  "read:teams:self",
  "read:teams:list",
  "read:team:detail",
  "read:team:tasks",
  "read:team:milestones",
  "read:projects:list",
  "read:projects:detail",
  "read:creators:list",
  "read:creators:detail",
  "read:topics:list",
  "read:topics:detail",
  "read:posts:list",
  "read:posts:detail",
];

export function normalizeApiKeyScopes(raw: string[] | undefined): ApiKeyScope[] {
  if (!raw?.length) {
    return [...DEFAULT_API_KEY_SCOPES];
  }
  const out = new Set<ApiKeyScope>();
  for (const s of raw) {
    const t = s.trim();
    if (!t || !SCOPE_SET.has(t)) {
      throw new Error("INVALID_API_KEY_SCOPE");
    }
    out.add(t as ApiKeyScope);
  }
  if (!out.has(API_KEY_SCOPE_READ_PUBLIC)) {
    throw new Error("API_KEY_SCOPE_READ_PUBLIC_REQUIRED");
  }
  return [...out];
}

/** Cookie sessions have full access; API key sessions must include `required`. */
export function allowApiKeyScope(session: SessionUser, required: ApiKeyScope): boolean {
  if (!session.apiKeyScopes?.length) {
    return true;
  }
  const scopes = session.apiKeyScopes;
  if (scopes.includes(required)) return true;
  if (required === "write:posts" && scopes.includes("write:mcp:v2:posts")) return true;
  if (required === "write:projects" && scopes.includes("write:mcp:v2:projects")) return true;
  return false;
}
