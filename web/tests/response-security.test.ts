import { describe, expect, it, vi } from "vitest";

describe("apiError security sanitization", () => {
  it("strips 5xx details in production", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    const { apiError } = await import("../src/lib/response");
    const response = apiError(
      { code: "INTERNAL_ERROR", message: "Failed", details: { message: "secret", stack: "trace" } },
      500
    );
    const json = await response.json();
    expect(json.error).toEqual({ code: "INTERNAL_ERROR", message: "Failed" });
  });

  it("keeps validation details for 4xx responses", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    const { apiError } = await import("../src/lib/response");
    const response = apiError(
      { code: "INVALID_BODY", message: "Bad request", details: { fieldErrors: { email: ["required"] } } },
      400
    );
    const json = await response.json();
    expect(json.error.details).toEqual({ fieldErrors: { email: ["required"] } });
  });
});
