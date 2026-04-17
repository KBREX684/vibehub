#!/usr/bin/env tsx
/**
 * v8 W2 — audit-ui-inlines
 *
 * Walks the `src/` tree and flags JSX `className` literals that either:
 *   1. use >= `threshold` whitespace-separated tokens in a single literal
 *      (default 10 — anything shorter is considered natural Tailwind)
 *   2. include DESIGN.md-banned palette literals such as `text-white` /
 *      `bg-stone-*` / `text-gray-*`
 *
 * The baseline threshold was raised from 6 → 10 after the W2 stage-2
 * migration, because a well-factored conditional className (token + state
 * + hover) naturally uses 6–9 tokens. Below 10 tokens, the remaining hits
 * are noise from focus rings, conditional state, and multi-concern stacks
 * that are *already* token-driven.
 *
 * Usage:
 *   tsx scripts/audit-ui-inlines.ts                 # warn-only, full report
 *   tsx scripts/audit-ui-inlines.ts --strict        # non-zero on any hit
 *   tsx scripts/audit-ui-inlines.ts --strict-palette# non-zero only on palette hits
 *   tsx scripts/audit-ui-inlines.ts --limit=30      # print top N offenders
 *   tsx scripts/audit-ui-inlines.ts --threshold=8   # token threshold
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const SRC = path.join(ROOT, "src");
const ALLOWED_COLOR_PREFIXES = [
  "text-[",
  "bg-[",
  "border-[",
  "ring-[",
];
const HARD_VIOLATION_PATTERNS = [
  /\btext-(?:white|black|gray-\d+|stone-\d+|amber-\d+|slate-\d+|zinc-\d+)\b/,
  /\bbg-(?:white|black|gray-\d+|stone-\d+|amber-\d+|slate-\d+|zinc-\d+)\b/,
];

const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "generated",
  "__mocks__",
  "__snapshots__",
  "tests",
  "e2e",
]);

const ARGS = new Map<string, string | boolean>();
for (const raw of process.argv.slice(2)) {
  const [k, v] = raw.replace(/^--/, "").split("=");
  ARGS.set(k, v ?? true);
}

const STRICT = ARGS.has("strict");
/** `--strict-palette`: fail only on palette violations (post-W2 gate). */
const STRICT_PALETTE = ARGS.has("strict-palette");
const LIMIT = parseInt(String(ARGS.get("limit") ?? "0"), 10) || 0;
const TOKEN_THRESHOLD = parseInt(String(ARGS.get("threshold") ?? "10"), 10) || 10;

type Finding = {
  file: string;
  line: number;
  tokenCount: number;
  snippet: string;
  reason: "token-count" | "palette-violation";
};

function listFiles(dir: string, out: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (IGNORED_DIRS.has(ent.name)) continue;
      listFiles(path.join(dir, ent.name), out);
    } else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) {
      out.push(path.join(dir, ent.name));
    }
  }
  return out;
}

function isInsideUiPrimitive(file: string): boolean {
  return file.replace(/\\/g, "/").includes("/src/components/ui/");
}

/**
 * Files where high-token-count classes are legitimately needed
 * (conditional nav pills with state variants + focus rings, admin table
 * rows with multi-state styling, third-party wrapper components). These
 * are reviewed once here rather than disabling the rule for every call
 * site. Listed as POSIX-style path suffixes.
 */
const TOKEN_COUNT_ALLOWLIST = new Set<string>([
  // SiteNav pill active-state + focus ring is intentionally long.
  "src/components/site-nav.tsx",
  // Layout skip-to-content link: all `focus:` state tokens for a11y.
  "src/app/layout.tsx",
]);

function isAllowlistedForTokenCount(relPath: string): boolean {
  const p = relPath.replace(/\\/g, "/");
  return TOKEN_COUNT_ALLOWLIST.has(p);
}

function extractClassNameLiterals(source: string): Array<{ value: string; line: number }> {
  const out: Array<{ value: string; line: number }> = [];
  const regex = /className\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    const pre = source.slice(0, match.index);
    const line = pre.split("\n").length;
    out.push({ value: match[1] ?? "", line });
  }
  return out;
}

function tokenCount(value: string): number {
  return value
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean).length;
}

function matchesPaletteViolation(value: string): boolean {
  for (const pat of HARD_VIOLATION_PATTERNS) {
    if (pat.test(value)) {
      // A CSS-variable bracketed token (e.g. text-[var(--color-text-primary)])
      // might incidentally contain words that look like palette literals.
      const bracketed = ALLOWED_COLOR_PREFIXES.some((p) => value.includes(p));
      if (!bracketed) return true;
    }
  }
  return false;
}

function scan(): Finding[] {
  const files = listFiles(SRC);
  const findings: Finding[] = [];

  for (const file of files) {
    if (isInsideUiPrimitive(file)) continue;
    const source = fs.readFileSync(file, "utf8");
    const literals = extractClassNameLiterals(source);
    for (const lit of literals) {
      const count = tokenCount(lit.value);
      if (matchesPaletteViolation(lit.value)) {
        findings.push({
          file: path.relative(ROOT, file),
          line: lit.line,
          tokenCount: count,
          snippet: lit.value.slice(0, 160),
          reason: "palette-violation",
        });
        continue;
      }
      if (count > TOKEN_THRESHOLD) {
        const rel = path.relative(ROOT, file);
        if (!isAllowlistedForTokenCount(rel)) {
          findings.push({
            file: rel,
            line: lit.line,
            tokenCount: count,
            snippet: lit.value.slice(0, 160),
            reason: "token-count",
          });
        }
      }
    }
  }

  findings.sort((a, b) => b.tokenCount - a.tokenCount);
  return findings;
}

function main() {
  const findings = scan();
  const palette = findings.filter((f) => f.reason === "palette-violation");
  const over = findings.filter((f) => f.reason === "token-count");

  const byFile = new Map<string, number>();
  for (const f of findings) byFile.set(f.file, (byFile.get(f.file) ?? 0) + 1);

  console.log(`\nVibeHub UI-inline audit (threshold = ${TOKEN_THRESHOLD} tokens)`);
  console.log(`================================================================`);
  console.log(`Scanned:         ${path.relative(ROOT, SRC)}`);
  console.log(`Token-count hits: ${over.length}`);
  console.log(`Palette hits:     ${palette.length}`);
  console.log(`Files w/ hits:    ${byFile.size}`);
  console.log("");

  const shown = LIMIT > 0 ? findings.slice(0, LIMIT) : findings;
  for (const f of shown) {
    const marker = f.reason === "palette-violation" ? "[palette]" : "[long]   ";
    console.log(`${marker} ${f.file}:${f.line}  (${f.tokenCount} tokens)`);
    console.log(`    ${f.snippet}`);
  }

  if (findings.length === 0) {
    console.log("No inline-style violations found.");
  }

  if (STRICT && findings.length > 0) {
    process.exit(1);
  }
  if (STRICT_PALETTE && palette.length > 0) {
    process.exit(1);
  }
}

main();
