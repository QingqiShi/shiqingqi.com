import { getRedisClient } from "@tuja/server-clients/get-redis-client";
import type { UIMessage } from "ai";
import "server-only";
import { KEY_PREFIX } from "./constants";

export async function getSessionMessages(
  sessionId: string,
): Promise<UIMessage[] | null> {
  const redis = getRedisClient();
  const data = await redis.get<UIMessage[]>(`${KEY_PREFIX}${sessionId}`);
  return data;
}
