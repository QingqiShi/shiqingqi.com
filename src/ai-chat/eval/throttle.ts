export type Clock = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
};

export type TokenThrottle = {
  record: (tokens: number) => void;
  waitIfNeeded: () => Promise<void>;
};

const defaultClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

const WINDOW_MS = 60_000;
const TOKEN_LIMIT = 30_000;
const BUFFER = 5_000;

export function createThrottle(clock: Clock = defaultClock): TokenThrottle {
  let entries: Array<{ tokens: number; timestamp: number }> = [];

  function pruneWindow(): number {
    const cutoff = clock.now() - WINDOW_MS;
    entries = entries.filter((e) => e.timestamp > cutoff);
    return entries.reduce((sum, e) => sum + e.tokens, 0);
  }

  function record(tokens: number): void {
    entries.push({ tokens, timestamp: clock.now() });
  }

  async function waitIfNeeded(): Promise<void> {
    const threshold = TOKEN_LIMIT - BUFFER;
    let total = pruneWindow();

    while (total >= threshold) {
      const oldest = entries[0];
      if (!oldest) break;

      const ageOutAt = oldest.timestamp + WINDOW_MS;
      const sleepMs = ageOutAt - clock.now();
      if (sleepMs > 0) {
        await clock.sleep(sleepMs);
      }
      total = pruneWindow();
    }
  }

  return { record, waitIfNeeded };
}

export const throttle = createThrottle();
