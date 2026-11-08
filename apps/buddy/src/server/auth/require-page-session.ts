import type { SupportedLocale } from "@tuja/i18n/types";
import { redirect } from "next/navigation";
import "server-only";
import { getPageSession } from "./get-page-session.ts";
import { signInPath } from "./sign-in-path.ts";
import type { BuddySession } from "./types.ts";

/** Returns the session, or redirects to sign-in with `next` set. */
export async function requirePageSession(
  locale: SupportedLocale,
  nextPath: string,
): Promise<BuddySession> {
  const session = await getPageSession();
  if (!session) redirect(signInPath(locale, nextPath));
  return session;
}
