import { Redis } from "@upstash/redis";
import "server-only";
import { MemoryBuddyKv } from "./memory-buddy-kv.ts";
import { RedisBuddyKv } from "./redis-buddy-kv.ts";
import type { BuddyKv } from "./types.ts";

interface BuddyBackend {
  kv: BuddyKv;
  inMemory: boolean;
}

declare global {
  // Next can load this module more than once in one process, and a dev hot
  // reload loads it again, but every copy must use one memory store.
  var buddyBackend: BuddyBackend | undefined;
}

function hasRedisEnv() {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN),
  );
}

function createBackend(): BuddyBackend {
  if (hasRedisEnv()) {
    return {
      kv: new RedisBuddyKv(Redis.fromEnv({ automaticDeserialization: false })),
      inMemory: false,
    };
  }
  if (process.env.VERCEL_URL) {
    throw new Error(
      "Buddy needs Upstash Redis: set KV_REST_API_URL and KV_REST_API_TOKEN.",
    );
  }
  return { kv: new MemoryBuddyKv(), inMemory: true };
}

export function getBuddyBackend(): BuddyBackend {
  globalThis.buddyBackend ??= createBackend();
  return globalThis.buddyBackend;
}
