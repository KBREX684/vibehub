import { describe, expect, it } from "vitest";
import { assertPublicHttpsUrl, isBlockedOutboundHost } from "../src/lib/private-network-url";

describe("isBlockedOutboundHost", () => {
  it("blocks loopback and private ranges", () => {
    expect(isBlockedOutboundHost("127.0.0.1")).toBe(true);
    expect(isBlockedOutboundHost("10.0.0.1")).toBe(true);
    expect(isBlockedOutboundHost("192.168.1.1")).toBe(true);
    expect(isBlockedOutboundHost("localhost")).toBe(true);
    expect(isBlockedOutboundHost("metadata.google.internal")).toBe(true);
  });

  it("allows public hostnames", () => {
    expect(isBlockedOutboundHost("example.com")).toBe(false);
    expect(isBlockedOutboundHost("hooks.slack.com")).toBe(false);
  });
});

describe("assertPublicHttpsUrl", () => {
  it("accepts https public URLs", () => {
    expect(assertPublicHttpsUrl("https://example.com/path").hostname).toBe("example.com");
  });

  it("rejects non-https and blocked hosts", () => {
    expect(() => assertPublicHttpsUrl("http://example.com/")).toThrow("INVALID_WEBHOOK_URL");
    expect(() => assertPublicHttpsUrl("https://127.0.0.1/x")).toThrow("WEBHOOK_URL_BLOCKED");
    expect(() => assertPublicHttpsUrl("https://192.168.0.1/x")).toThrow("WEBHOOK_URL_BLOCKED");
  });
});
