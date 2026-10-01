import { Redis } from "@upstash/redis";
import "server-only";

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}
