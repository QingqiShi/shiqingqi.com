import { isCronAuthorised } from "@tuja/server-auth/is-cron-authorised";
import { json } from "#src/auth/signed-in-route.ts";
import { exchangeDate } from "#src/fund/market/exchange-date.ts";
import { sessionFor } from "#src/fund/meeting/session-for.ts";
import { startAndAdvance } from "#src/fund/meeting/start-and-advance.ts";

export const maxDuration = 800;

/**
 * Vercel Cron calls this each 15 minutes from 05:00 to 06:45 UTC on a
 * weekday, which ends before London opens in winter and in summer. The
 * first call starts the daily meeting; a later call continues it if it
 * paused or failed. It never starts a strategy session.
 */
export async function GET(request: Request) {
  if (!isCronAuthorised(request, process.env.CRON_SECRET)) {
    return json({ error: "unauthorized" }, 401);
  }
  const today = exchangeDate(new Date(), "Europe/London");
  if (sessionFor(today) !== today) return json({ status: "weekend" });
  return json(await startAndAdvance({ kind: "daily", asOf: today }));
}
