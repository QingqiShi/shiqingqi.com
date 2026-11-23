import { cookies } from "next/headers";
import "server-only";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { fundSessionCookie } from "./fund-session-cookie.ts";
import { resolveSession } from "./resolve-session.ts";
import type { FundSession } from "./types.ts";

/**
 * For server components. A server component cannot set a cookie, so this
 * never renews the session; the next API request does.
 */
export async function getPageSession(): Promise<FundSession | null> {
  const token = (await cookies()).get(fundSessionCookie.name)?.value;
  if (!token) return null;
  const resolved = await resolveSession(getFundDb(), token, {
    now: new Date(),
    allowRefresh: false,
  });
  return resolved?.session ?? null;
}
