import { describe, expect, it } from "vitest";
import { checkRateLimit } from "../rate-limit";
import { RateLimitError } from "../errors";

describe("rate limiting", () => {
  it("allows up to the limit, then blocks", () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(() => checkRateLimit(key, 3, 60_000)).not.toThrow();
    }
    expect(() => checkRateLimit(key, 3, 60_000)).toThrow(RateLimitError);
  });

  it("tracks separate keys independently", () => {
    const base = `test:${Date.now()}:${Math.random()}`;
    checkRateLimit(`${base}:a`, 1, 60_000);
    expect(() => checkRateLimit(`${base}:b`, 1, 60_000)).not.toThrow();
  });
});
