import { describe, it, expect } from "vitest";
import { cryptoRandomSuffix, cryptoId } from "@/lib/crypto-id";

describe("cryptoRandomSuffix", () => {
  it("returns a string of the requested length", () => {
    for (const len of [6, 8, 12, 16]) {
      const result = cryptoRandomSuffix(len);
      expect(result).toHaveLength(len);
    }
  });

  it("only contains alphanumeric characters (base-36)", () => {
    for (let i = 0; i < 50; i++) {
      const result = cryptoRandomSuffix(12);
      expect(result).toMatch(/^[0-9a-z]+$/);
    }
  });

  it("generates unique values across invocations", () => {
    const results = new Set(Array.from({ length: 100 }, () => cryptoRandomSuffix(12)));
    // With ~62 bits of entropy per 12-char suffix, collisions are astronomically unlikely
    expect(results.size).toBe(100);
  });

  it("defaults to length 12", () => {
    expect(cryptoRandomSuffix()).toHaveLength(12);
  });
});

describe("cryptoId", () => {
  it("includes the prefix, timestamp, and random suffix", () => {
    const id = cryptoId("test", 8);
    const parts = id.split("_");
    expect(parts[0]).toBe("test");
    // Second part should be a numeric timestamp
    expect(Number(parts[1])).toBeGreaterThan(0);
    // Third part is the random suffix
    expect(parts[2]).toHaveLength(8);
    expect(parts[2]).toMatch(/^[0-9a-z]+$/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => cryptoId("n", 8)));
    expect(ids.size).toBe(100);
  });

  it("defaults suffix length to 12", () => {
    const id = cryptoId("x");
    const suffix = id.split("_")[2];
    expect(suffix).toHaveLength(12);
  });
});
