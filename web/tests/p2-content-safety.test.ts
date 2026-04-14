import { describe, expect, it } from "vitest";
import { assertContentSafeText, assertUrlCountAtMost } from "../src/lib/content-safety";

describe("content safety (P2-2)", () => {
  it("rejects script injection patterns", () => {
    expect(() => assertContentSafeText('hello <script>alert(1)</script>')).toThrow();
  });
  it("allows normal text", () => {
    expect(() => assertContentSafeText("hello world")).not.toThrow();
  });
  it("enforces URL cap", () => {
    expect(() => assertUrlCountAtMost("http://a http://b http://c http://d", 3)).toThrow();
  });
});
