import type { AssistantDb } from "#src/assistant/db/types.ts";
import { assistantAuthStore } from "./assistant-auth-store.ts";
import { assistantSessionCookie } from "./assistant-session-cookie.ts";

/** Stores a new session of the user and returns its raw token. For `assistant:session`, which signs an agent in without a passkey. */
export function createSession(
  db: AssistantDb,
  { userId, userAgent, now }: { userId: string; userAgent: string; now: Date },
): Promise<string> {
  return assistantAuthStore.createSession(db, {
    userId,
    userAgent,
    now,
    maxAgeSeconds: assistantSessionCookie.maxAgeSeconds,
  });
}
