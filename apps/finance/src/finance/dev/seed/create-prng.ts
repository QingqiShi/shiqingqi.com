interface Prng {
  /** A float in [0, 1). */
  next: () => number;
  /** An integer from `min` to `max`, both included. */
  int: (min: number, max: number) => number;
  chance: (probability: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
  /** One item, chosen with probability proportional to its weight. */
  weighted: <T>(items: readonly T[], weightOf: (item: T) => number) => T;
  /** A standard normal value. */
  normal: () => number;
}

/** A small seeded generator (mulberry32): the same seed gives the same sequence on every machine. */
export function createPrng(seed: number): Prng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  const int = (min: number, max: number) =>
    min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    chance: (probability) => next() < probability,
    pick: (items) => items[int(0, items.length - 1)],
    weighted: (items, weightOf) => {
      let total = 0;
      for (const item of items) total += weightOf(item);
      let target = next() * total;
      for (const item of items) {
        target -= weightOf(item);
        if (target < 0) return item;
      }
      return items[items.length - 1];
    },
    normal: () => {
      const u = 1 - next();
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
}
