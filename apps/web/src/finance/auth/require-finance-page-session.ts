import { redirect } from "next/navigation";
import "server-only";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { financeSignInPath } from "./finance-sign-in-path.ts";
import { getFinancePageSession } from "./get-finance-page-session.ts";
import type { FinanceSession } from "./types.ts";

/**
 * Returns the session, or redirects to sign-in with `next` set. Check
 * `isFinanceConfigured()` first: without a database every visitor has no
 * session.
 */
export async function requireFinancePageSession(
  locale: SupportedLocale,
  nextPath: string,
): Promise<FinanceSession> {
  const session = await getFinancePageSession();
  if (!session) redirect(financeSignInPath(locale, nextPath));
  return session;
}
