/**
 * P1: Compare OpenAPI paths to App Router `route.ts` files under `src/app/api/v1`.
 * Excludes `/admin/**` (internal ops surface; documented separately).
 */
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { buildOpenApiDocument } from "../src/lib/openapi-spec";

/** Run from `web/` (package root) so `src/app/api/v1` resolves reliably. */
function resolveApiV1Root(): string {
  const fromCwd = join(process.cwd(), "src/app/api/v1");
  if (existsSync(fromCwd)) return fromCwd;
  return join(__dirname, "../src/app/api/v1");
}

const API_ROOT = resolveApiV1Root();

/** Relative URL segments under `/api/v1`, e.g. `/auth/demo-login` */
function collectRoutePaths(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collectRoutePaths(full, `${base}/${name}`));
    } else if (name === "route.ts") {
      out.push(base || "/");
    }
  }
  return out;
}

function normalizeDynamic(seg: string): string {
  return seg.replace(/^\[/, "{").replace(/\]$/, "}");
}

function routeDirToOpenApiPath(routeDir: string): string {
  const parts = routeDir.split("/").filter(Boolean);
  const mapped = parts.map((p) => {
    if (p.startsWith("[[") && p.endsWith("]]")) {
      return `{${p.slice(2, -2)}}`;
    }
    if (p.startsWith("[") && p.endsWith("]")) {
      return normalizeDynamic(p);
    }
    return p;
  });
  return `/api/v1${mapped.length ? `/${mapped.join("/")}` : ""}`;
}

export function listImplementedApiPaths(): string[] {
  const dirs = collectRoutePaths(API_ROOT, "");
  return dirs.map((d) => routeDirToOpenApiPath(d)).sort();
}

export function validateOpenApiPathCoverage(minRatio: number): { ratio: number; missing: string[]; implemented: number; documented: number } {
  const doc = buildOpenApiDocument() as { paths: Record<string, unknown> };
  const documented = new Set(Object.keys(doc.paths ?? {}));

  const all = listImplementedApiPaths();
  const publicPaths = all.filter((p) => !p.includes("/admin/"));
  const missing = publicPaths.filter((p) => !documented.has(p));
  const ratio = publicPaths.length === 0 ? 1 : (publicPaths.length - missing.length) / publicPaths.length;

  if (ratio + 1e-9 < minRatio) {
    throw new Error(
      `OpenAPI path coverage ${(ratio * 100).toFixed(1)}% < ${(minRatio * 100).toFixed(0)}%. Missing ${missing.length} non-admin paths (first 40):\n${missing.slice(0, 40).join("\n")}`
    );
  }

  return { ratio, missing, implemented: publicPaths.length, documented: documented.size };
}
