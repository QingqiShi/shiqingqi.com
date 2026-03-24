export type Clock = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
};

const defaultClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

const WINDOW_MS = 60_000;
const TOKEN_LIMIT = 30_000;
const BUFFER = 5_000;

export class TokenThrottle {
  private entries: Array<{ tokens: number; timestamp: number }> = [];
  private clock: Clock;

  constructor(clock?: Clock) {
    this.clock = clock ?? defaultClock;
  }

  private pruneWindow(): number {
    const cutoff = this.clock.now() - WINDOW_MS;
    this.entries = this.entries.filter((e) => e.timestamp > cutoff);
    return this.entries.reduce((sum, e) => sum + e.tokens, 0);
  }

  record(tokens: number): void {
    this.entries.push({ tokens, timestamp: this.clock.now() });
  }

  async waitIfNeeded(): Promise<void> {
    const threshold = TOKEN_LIMIT - BUFFER;
    let total = this.pruneWindow();

    while (total >= threshold) {
      const oldest = this.entries[0];
      if (!oldest) break;

      const ageOutAt = oldest.timestamp + WINDOW_MS;
      const sleepMs = ageOutAt - this.clock.now();
      if (sleepMs > 0) {
        await this.clock.sleep(sleepMs);
      }
      total = this.pruneWindow();
    }
  }
}

export function createThrottle(clock?: Clock) {
  return new TokenThrottle(clock);
}

export const throttle = new TokenThrottle();
