import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "../src/lib/openapi-spec";
import { validateOpenApiDocument } from "../src/lib/openapi-validate";

describe("OpenAPI spec (P4-4 + P4-5)", () => {
  it("passes structural validation (P4-5 CI gate)", () => {
    const doc = buildOpenApiDocument();
    expect(() => validateOpenApiDocument(doc)).not.toThrow();
  });

  it("is OpenAPI 3.0.3 with required paths", () => {
    const doc = buildOpenApiDocument() as {
      openapi: string;
      paths: Record<string, unknown>;
      info: { title: string };
    };
    expect(doc.openapi).toBe("3.0.3");
    expect(doc.info.title).toBe("VibeHub API");
    expect(doc.paths["/api/v1/openapi.json"]).toBeDefined();
    expect(doc.paths["/api/v1/public/projects"]).toBeDefined();
    expect(doc.paths["/api/v1/me/api-keys"]).toBeDefined();
  });
});
