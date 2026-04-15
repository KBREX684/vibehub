#!/usr/bin/env npx tsx
/**
 * CI/local gate: ensures OpenAPI document builds and passes structural checks.
 * Run from `web/`: `npx tsx scripts/validate-openapi.ts`
 */
import { buildAndValidateOpenApiDocument } from "../src/lib/openapi-validate";
import { validateOpenApiPathCoverage } from "./openapi-path-coverage";

const doc = buildAndValidateOpenApiDocument();
const pathCount = Object.keys(doc.paths as object).length;
const cov = validateOpenApiPathCoverage(0.8);
// eslint-disable-next-line no-console -- CLI script
console.log(
  `OpenAPI OK: openapi=${String(doc.openapi)}, paths=${pathCount}, non-admin coverage=${(cov.ratio * 100).toFixed(1)}% (${cov.implemented} routes)`
);
