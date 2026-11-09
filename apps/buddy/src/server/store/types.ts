export interface BuddyKv {
  get(key: string): Promise<string | null>;
  getMany(keys: readonly string[]): Promise<(string | null)[]>;
  /** Without `ttlSeconds` the key stays. False when `onlyIfAbsent` is set and the key exists. */
  set(
    key: string,
    value: string,
    options?: { ttlSeconds?: number; onlyIfAbsent?: boolean },
  ): Promise<boolean>;
  del(key: string): Promise<void>;
  delMany(keys: readonly string[]): Promise<void>;
  /** The first count of a key starts its `ttlSeconds`. */
  increment(key: string, ttlSeconds: number): Promise<number>;
  /** Adds each count to its key, which stays, in one round trip. A count of 0 sends nothing. */
  incrementBy(
    counts: readonly (readonly [key: string, by: number])[],
  ): Promise<void>;
  addToSet(key: string, members: readonly string[]): Promise<void>;
  removeFromSet(key: string, members: readonly string[]): Promise<void>;
  setMembers(key: string): Promise<string[]>;
}
