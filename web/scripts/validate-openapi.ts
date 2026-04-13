#!/usr/bin/env npx tsx
/**
 * CI/local gate: ensures OpenAPI document builds and passes structural checks.
 * Run from `web/`: `npx tsx scripts/validate-openapi.ts`
 */
import { buildAndValidateOpenApiDocument } from "../src/lib/openapi-validate";

const doc = buildAndValidateOpenApiDocument();
const pathCount = Object.keys(doc.paths as object).length;
// eslint-disable-next-line no-console -- CLI script
console.log(`OpenAPI OK: openapi=${String(doc.openapi)}, paths=${pathCount}`);
