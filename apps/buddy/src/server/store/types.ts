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
  addToSet(key: string, members: readonly string[]): Promise<void>;
  removeFromSet(key: string, members: readonly string[]): Promise<void>;
  setMembers(key: string): Promise<string[]>;
}
