import { describe, expect, it } from "vitest";
import { sanitizeSameOriginRedirectPath } from "../src/lib/redirect-safety";

describe("sanitizeSameOriginRedirectPath", () => {
  it("allows simple relative paths", () => {
    expect(sanitizeSameOriginRedirectPath("/teams/foo")).toBe("/teams/foo");
    expect(sanitizeSameOriginRedirectPath("/")).toBe("/");
  });

  it("rejects protocol-relative and external-looking paths", () => {
    expect(sanitizeSameOriginRedirectPath("//evil.example/path")).toBe("/");
    expect(sanitizeSameOriginRedirectPath("/\\evil.example")).toBe("/");
    expect(sanitizeSameOriginRedirectPath("/foo//bar")).toBe("/foo//bar"); // still same-origin path segment
  });

  it("rejects javascript and backslash tricks", () => {
    expect(sanitizeSameOriginRedirectPath("javascript:alert(1)")).toBe("/");
    expect(sanitizeSameOriginRedirectPath("/\\")).toBe("/");
  });

  it("decodes once and still validates", () => {
    expect(sanitizeSameOriginRedirectPath(encodeURIComponent("/settings"))).toBe("/settings");
  });

  it("returns default for null", () => {
    expect(sanitizeSameOriginRedirectPath(null)).toBe("/");
    expect(sanitizeSameOriginRedirectPath(undefined, "/home")).toBe("/home");
  });
});
