#!/usr/bin/env npx tsx
/**
 * P4-4: emit `src/lib/generated/api-types.ts` from the in-repo OpenAPI document.
 * Run from `web/`: `npm run generate:types`
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndValidateOpenApiDocument } from "../src/lib/openapi-validate";

const webRoot = join(fileURLToPath(new URL("..", import.meta.url)));
const outDir = join(webRoot, "src/lib/generated");
const outFile = join(outDir, "api-types.ts");
const tmpFile = join(tmpdir(), `vibehub-openapi-${process.pid}.json`);

mkdirSync(outDir, { recursive: true });
writeFileSync(tmpFile, JSON.stringify(buildAndValidateOpenApiDocument(), null, 0), "utf8");

try {
  execFileSync("npx", ["openapi-typescript", tmpFile, "-o", outFile], {
    cwd: webRoot,
    stdio: "inherit",
  });
} finally {
  try {
    unlinkSync(tmpFile);
  } catch {
    /* ignore */
  }
}
