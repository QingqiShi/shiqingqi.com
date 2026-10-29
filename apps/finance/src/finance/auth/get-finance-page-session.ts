import { cookies } from "next/headers";
import "server-only";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import { resolveSession } from "./resolve-session.ts";
import type { FinanceSession } from "./types.ts";

/**
 * For server components. A server component cannot set a cookie, so this
 * never renews the session; the next API request does.
 */
export async function getFinancePageSession(): Promise<FinanceSession | null> {
  if (!isFinanceConfigured()) return null;
  const token = (await cookies()).get(financeSessionCookie.name)?.value;
  if (!token) return null;
  const resolved = await resolveSession(getFinanceDb(), token, {
    now: new Date(),
    allowRefresh: false,
  });
  return resolved?.session ?? null;
}
