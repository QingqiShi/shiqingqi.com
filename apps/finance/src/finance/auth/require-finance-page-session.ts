import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import { redirect } from "next/navigation";
import "server-only";
import {
  getFinancePageSession,
  getNewUserPageSession,
} from "./get-finance-page-session.ts";
import type { FinanceSession } from "./types.ts";

export const WELCOME_PATH = "/welcome";

/**
 * Returns the session. Redirects a user who is a Member of no Household to
 * the first-run screen, and a visitor to sign-in with `next` set. Check
 * `isFinanceConfigured()` first: without a database every visitor has no
 * session.
 */
export async function requireFinancePageSession(
  locale: SupportedLocale,
  nextPath: string,
): Promise<FinanceSession> {
  const session = await getFinancePageSession();
  if (session) return session;
  if (await getNewUserPageSession()) {
    redirect(getLocalePath(WELCOME_PATH, locale));
  }
  redirect(signInPath(locale, nextPath));
}
