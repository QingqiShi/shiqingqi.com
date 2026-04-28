import { describe, it, expect } from "vitest";
import { type Clock, RateLimiter } from "./rate-limiter.ts";

function makeFakeClock(): Clock & {
  time: number;
  advance: (ms: number) => void;
} {
  let time = 0;
  return {
    get time() {
      return time;
    },
    now: () => time,
    sleep: () => Promise.resolve(),
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe("RateLimiter", () => {
  it("allows immediate acquisition when tokens available", async () => {
    const clock = makeFakeClock();
    const limiter = new RateLimiter(10, 1000, clock);
    await limiter.acquire();
    expect(limiter.tokens).toBe(9);
  });

  it("tracks backoff on rate limit", () => {
    const clock = makeFakeClock();
    const limiter = new RateLimiter(10, 1000, clock);
    limiter.onRateLimited();
    expect(limiter.backoffMs).toBe(1000);
    expect(limiter.tokens).toBe(0);
  });

  it("doubles backoff on repeated rate limits", () => {
    const clock = makeFakeClock();
    const limiter = new RateLimiter(10, 1000, clock);
    limiter.onRateLimited();
    expect(limiter.backoffMs).toBe(1000);
    limiter.onRateLimited();
    expect(limiter.backoffMs).toBe(2000);
    limiter.onRateLimited();
    expect(limiter.backoffMs).toBe(4000);
  });

  it("resets backoff", () => {
    const clock = makeFakeClock();
    const limiter = new RateLimiter(10, 1000, clock);
    limiter.onRateLimited();
    limiter.resetBackoff();
    expect(limiter.backoffMs).toBe(0);
  });

  it("refills tokens after time passes", async () => {
    const clock = makeFakeClock();
    const limiter = new RateLimiter(10, 1000, clock);
    for (let i = 0; i < 10; i++) {
      await limiter.acquire();
    }
    expect(limiter.tokens).toBe(0);

    clock.advance(1000);
    await limiter.acquire();
    expect(limiter.tokens).toBe(9);
  });

  it("serializes concurrent acquire calls", async () => {
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
