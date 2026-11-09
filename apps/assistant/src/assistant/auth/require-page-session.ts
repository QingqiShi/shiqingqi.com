import type { SupportedLocale } from "@tuja/i18n/types";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import { redirect } from "next/navigation";
import "server-only";
import { getPageSession } from "./get-page-session.ts";
import type { AssistantSession } from "./types.ts";

/**
 * Returns the session, or redirects to sign-in with `next` set. Check
 * `isAssistantConfigured()` first: without a database every visitor has no
 * session.
 */
export async function requirePageSession(
  locale: SupportedLocale,
  nextPath: string,
): Promise<AssistantSession> {
  const session = await getPageSession();
  if (!session) redirect(signInPath(locale, nextPath));
  return session;
}
