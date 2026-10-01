import type { UIMessage } from "ai";
import "server-only";
import { getRedisClient } from "#src/redis/get-redis-client.ts";
import { KEY_PREFIX, TTL_SECONDS } from "./constants";

export async function saveSessionMessages(
  sessionId: string,
  messages: UIMessage[],
): Promise<void> {
  const redis = getRedisClient();
  await redis.set(`${KEY_PREFIX}${sessionId}`, messages, {
    ex: TTL_SECONDS,
  });
}
