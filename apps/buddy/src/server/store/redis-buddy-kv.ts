import type { Redis } from "@upstash/redis";
import type { BuddyKv } from "./types.ts";

const asString = (value: unknown) => (typeof value === "string" ? value : null);

export class RedisBuddyKv implements BuddyKv {
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async get(key: string) {
    return asString(await this.redis.get<string>(key));
  }

  async getMany(keys: readonly string[]) {
    if (keys.length === 0) return [];
    const values: unknown = await this.redis.mget(...keys);
    return keys.map((_, index) =>
      asString(Array.isArray(values) ? values[index] : null),
    );
  }

  async set(
    key: string,
    value: string,
    options: { ttlSeconds?: number; onlyIfAbsent?: boolean } = {},
  ) {
    const { ttlSeconds, onlyIfAbsent } = options;
    const result =
      ttlSeconds === undefined
        ? onlyIfAbsent
          ? await this.redis.set(key, value, { nx: true })
          : await this.redis.set(key, value)
        : onlyIfAbsent
          ? await this.redis.set(key, value, { ex: ttlSeconds, nx: true })
          : await this.redis.set(key, value, { ex: ttlSeconds });
    return result === "OK";
  }

  async del(key: string) {
    await this.redis.del(key);
  }

  async delMany(keys: readonly string[]) {
    if (keys.length === 0) return;
    await this.redis.del(...keys);
  }

  async increment(key: string, ttlSeconds: number) {
    const [count] = await this.redis
      .multi()
      .incr(key)
      .expire(key, ttlSeconds, "NX")
      .exec<[number, number]>();
    return count;
  }

  async addToSet(key: string, members: readonly string[]) {
    if (members.length === 0) return;
    await this.redis.sadd(key, members[0], ...members.slice(1));
  }

  async removeFromSet(key: string, members: readonly string[]) {
    if (members.length === 0) return;
    await this.redis.srem(key, ...members);
  }

  async setMembers(key: string) {
    const members: unknown = await this.redis.smembers(key);
    return Array.isArray(members) ? members.map(String) : [];
  }
}
