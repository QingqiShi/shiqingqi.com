import { randomUUID } from "crypto";
import type { UIMessage } from "ai";
import "server-only";
import { getRedisClient } from "./client";

const KEY_PREFIX = "chat-session:";
const TTL_SECONDS = 24 * 60 * 60; // 24 hours

export async function getSessionMessages(
  sessionId: string,
): Promise<UIMessage[] | null> {
  const redis = getRedisClient();
  const data = await redis.get<UIMessage[]>(`${KEY_PREFIX}${sessionId}`);
  return data;
}

export async function saveSessionMessages(
  sessionId: string,
  messages: UIMessage[],
): Promise<void> {
  const redis = getRedisClient();
  await redis.set(`${KEY_PREFIX}${sessionId}`, messages, {
    ex: TTL_SECONDS,
  });
}

export function generateSessionId(): string {
  return randomUUID();
}
