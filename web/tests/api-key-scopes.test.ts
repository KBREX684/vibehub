import { describe, expect, it } from "vitest";
import {
  API_KEY_SCOPE_READ_PUBLIC,
  allowApiKeyScope,
  normalizeApiKeyScopes,
} from "../src/lib/api-key-scopes";
import type { SessionUser } from "../src/lib/types";

describe("api-key-scopes", () => {
  it("normalizeApiKeyScopes adds read:public when omitted from explicit list", () => {
    expect(() => normalizeApiKeyScopes(["read:projects:list"])).toThrow("API_KEY_SCOPE_READ_PUBLIC_REQUIRED");
  });

  it("normalizeApiKeyScopes rejects unknown scope", () => {
    expect(() => normalizeApiKeyScopes([API_KEY_SCOPE_READ_PUBLIC, "read:invalid"])).toThrow(
      "INVALID_API_KEY_SCOPE"
    );
  });

  it("allowApiKeyScope: cookie session (no apiKeyScopes) passes any scope", () => {
    const s: SessionUser = { userId: "u1", role: "user", name: "A" };
    expect(allowApiKeyScope(s, "read:projects:list")).toBe(true);
  });

  it("allowApiKeyScope: key session must include scope", () => {
    const s: SessionUser = {
      userId: "u1",
      role: "user",
      name: "A",
      apiKeyScopes: [API_KEY_SCOPE_READ_PUBLIC, "read:projects:list"],
    };
    expect(allowApiKeyScope(s, "read:projects:list")).toBe(true);
    expect(allowApiKeyScope(s, "read:teams:self")).toBe(false);
  });
});
