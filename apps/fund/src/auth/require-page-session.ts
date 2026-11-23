import type { SupportedLocale } from "@tuja/i18n/types";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import { redirect } from "next/navigation";
import "server-only";
import { getPageSession } from "./get-page-session.ts";
import type { FundSession } from "./types.ts";

/** Returns the session of a page, or redirects to sign-in with `next` set to `nextPath`. */
export async function requirePageSession(
  locale: SupportedLocale,
  nextPath: string,
): Promise<FundSession> {
  const session = await getPageSession();
  if (!session) redirect(signInPath(locale, nextPath));
  return session;
}
