import type { BuddyKv } from "./types.ts";

export class MemoryBuddyKv implements BuddyKv {
  private readonly values = new Map<
    string,
    { value: string; expiresAt: number }
  >();
  private readonly sets = new Map<string, Set<string>>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  private live(key: string) {
    const entry = this.values.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.values.delete(key);
      return null;
    }
    return entry;
  }

  get(key: string) {
    return Promise.resolve(this.live(key)?.value ?? null);
  }

  getMany(keys: readonly string[]) {
    return Promise.resolve(keys.map((key) => this.live(key)?.value ?? null));
  }

  set(
    key: string,
    value: string,
    options: { ttlSeconds?: number; onlyIfAbsent?: boolean } = {},
  ) {
    if (options.onlyIfAbsent && this.live(key)) return Promise.resolve(false);
    this.values.set(key, {
      value,
      expiresAt:
        options.ttlSeconds === undefined
          ? Infinity
          : this.now() + options.ttlSeconds * 1000,
    });
    return Promise.resolve(true);
  }

  del(key: string) {
    return this.delMany([key]);
  }

  delMany(keys: readonly string[]) {
    for (const key of keys) {
      this.values.delete(key);
      this.sets.delete(key);
    }
    return Promise.resolve();
  }

  increment(key: string, ttlSeconds: number) {
    const entry = this.live(key);
    const count = entry ? Number(entry.value) + 1 : 1;
    this.values.set(key, {
      value: String(count),
      expiresAt: entry?.expiresAt ?? this.now() + ttlSeconds * 1000,
    });
    return Promise.resolve(count);
  }

  addToSet(key: string, members: readonly string[]) {
    const set = this.sets.get(key) ?? new Set<string>();
    this.sets.set(key, set);
    for (const member of members) set.add(member);
    return Promise.resolve();
  }

  removeFromSet(key: string, members: readonly string[]) {
    const set = this.sets.get(key);
    for (const member of members) set?.delete(member);
    return Promise.resolve();
  }

  setMembers(key: string) {
    return Promise.resolve([...(this.sets.get(key) ?? [])]);
  }
}
