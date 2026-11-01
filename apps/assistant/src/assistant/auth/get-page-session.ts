import { cookies } from "next/headers";
import "server-only";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { assistantSessionCookie } from "./assistant-session-cookie.ts";
import { resolveSession } from "./resolve-session.ts";
import type { AssistantSession } from "./types.ts";

/**
 * For server components. A server component cannot set a cookie, so this
 * never renews the session; the next API request does.
 */
export async function getPageSession(): Promise<AssistantSession | null> {
  if (!isAssistantConfigured()) return null;
  const token = (await cookies()).get(assistantSessionCookie.name)?.value;
  if (!token) return null;
  const resolved = await resolveSession(getAssistantDb(), token, {
    now: new Date(),
    allowRefresh: false,
  });
  return resolved?.session ?? null;
}
