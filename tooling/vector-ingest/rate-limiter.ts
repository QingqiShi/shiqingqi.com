/**
 * Token-bucket rate limiter for TMDB API requests.
 * Targets 30 req/s (conservative under TMDB's ~40 req/s limit).
 * Handles HTTP 429 responses with exponential backoff.
 *
 * Concurrent `acquire()` calls are serialized via a promise chain
 * so the token bucket state is never accessed concurrently.
 */
export class RateLimiter {
  tokens: number;
  lastRefill: number;
  backoffMs = 0;
  maxTokens: number;
  refillIntervalMs: number;
  private pending: Promise<void> = Promise.resolve();

  constructor(maxTokens = 30, refillIntervalMs = 1000) {
    this.maxTokens = maxTokens;
    this.refillIntervalMs = refillIntervalMs;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(
      (elapsed / this.refillIntervalMs) * this.maxTokens,
    );
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  async acquire(): Promise<void> {
    const ticket = this.pending.then(() => this.acquireInternal());
    this.pending = ticket.catch(() => {});
    return ticket;
  }

  private async acquireInternal(): Promise<void> {
    if (this.backoffMs > 0) {
      await sleep(this.backoffMs);
      this.backoffMs = 0;
    }

    this.refill();

    if (this.tokens <= 0) {
      const waitMs = Math.ceil(this.refillIntervalMs / this.maxTokens);
      await sleep(waitMs);
      this.refill();
    }

    this.tokens--;
  }

  onRateLimited(): void {
    this.backoffMs = Math.max(1000, this.backoffMs * 2 || 1000);
    this.tokens = 0;
  }

  resetBackoff(): void {
    this.backoffMs = 0;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
