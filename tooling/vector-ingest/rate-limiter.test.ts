import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { RateLimiter } from "./rate-limiter.ts";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows immediate acquisition when tokens available", async () => {
    const limiter = new RateLimiter(10, 1000);
    await limiter.acquire();
    expect(limiter.tokens).toBe(9);
  });

  it("tracks backoff on rate limit", () => {
    const limiter = new RateLimiter(10, 1000);
    limiter.onRateLimited();
    expect(limiter.backoffMs).toBe(1000);
    expect(limiter.tokens).toBe(0);
  });

  it("doubles backoff on repeated rate limits", () => {
    const limiter = new RateLimiter(10, 1000);
    limiter.onRateLimited();
    expect(limiter.backoffMs).toBe(1000);
    limiter.onRateLimited();
    expect(limiter.backoffMs).toBe(2000);
    limiter.onRateLimited();
    expect(limiter.backoffMs).toBe(4000);
  });

  it("resets backoff", () => {
    const limiter = new RateLimiter(10, 1000);
    limiter.onRateLimited();
    limiter.resetBackoff();
    expect(limiter.backoffMs).toBe(0);
  });

  it("refills tokens after time passes", async () => {
    const limiter = new RateLimiter(10, 1000);
    for (let i = 0; i < 10; i++) {
      await limiter.acquire();
    }
    expect(limiter.tokens).toBe(0);

    vi.advanceTimersByTime(1000);
    await limiter.acquire();
    expect(limiter.tokens).toBe(9);
  });

  it("serializes concurrent acquire calls", async () => {
    vi.useRealTimers();
    const limiter = new RateLimiter(5, 1000);

    // Fire 5 concurrent acquires
    await Promise.all([
      limiter.acquire(),
      limiter.acquire(),
      limiter.acquire(),
      limiter.acquire(),
      limiter.acquire(),
    ]);

    // All 5 tokens consumed, none negative
    expect(limiter.tokens).toBe(0);
  });
});
