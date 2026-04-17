#!/usr/bin/env tsx
/**
 * v8 W2 — audit-ui-inlines
 *
 * Walk the `src/app`, `src/components` and `src/hooks` trees and flag any
 * JSX `className` literal that contains more than N Tailwind-style tokens
 * without going through one of the approved `components/ui/*` primitives.
 * This is the *warning* sibling of a stricter future lint rule; it prints a
 * report and exits 0. A dedicated CI gate can be enabled later by passing
 * `--strict` once the baseline is clean.
 *
 * Usage:
 *   tsx scripts/audit-ui-inlines.ts               # warn-only, full report
 *   tsx scripts/audit-ui-inlines.ts --strict      # exit non-zero on any hit
 *   tsx scripts/audit-ui-inlines.ts --limit=30    # print top N offenders
 *   tsx scripts/audit-ui-inlines.ts --threshold=8 # token threshold (default 6)
 *
 * What counts as a "token": anything separated by whitespace inside the
 * className string literal. We deliberately keep the heuristic cheap and
 * easy to understand rather than parsing Tailwind variants properly.
 *
 * What we do NOT flag:
 *   - className on elements inside a `components/ui/*` file itself
 *   - template-literal classNames (we can't reason about them statically)
 *   - files under test / scripts / generated paths
 *   - imports from `@/components/ui` call sites
 *
 * What we DO flag:
 *   - JSX `className="..."` literals with > threshold whitespace tokens
 *   - Classes mixing `text-white` / `text-gray-*` / `text-stone-*` tokens
 *     (these are explicit DESIGN.md violations and reported regardless of
 *     token count)
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
const LIMIT = parseInt(String(ARGS.get("limit") ?? "0"), 10) || 0;
const TOKEN_THRESHOLD = parseInt(String(ARGS.get("threshold") ?? "6"), 10) || 6;

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
        findings.push({
          file: path.relative(ROOT, file),
          line: lit.line,
          tokenCount: count,
          snippet: lit.value.slice(0, 160),
          reason: "token-count",
        });
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
}

main();
