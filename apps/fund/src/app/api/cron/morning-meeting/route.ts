import { isCronAuthorised } from "@tuja/server-auth/is-cron-authorised";
import { json } from "#src/auth/signed-in-route.ts";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { exchangeDate } from "#src/fund/market/exchange-date.ts";
import { sessionFor } from "#src/fund/meeting/session-for.ts";
import { startAndAdvance } from "#src/fund/meeting/start-and-advance.ts";
import { hasAnyMeeting } from "#src/fund/meeting/start-meeting.ts";

export const maxDuration = 800;

/**
 * Vercel Cron calls this each 15 minutes from 05:00 to 06:45 UTC on a
 * weekday, which ends before London opens in winter and in summer. The
 * first call starts the meeting; a later call continues it if it paused or
 * failed. It does nothing until the owner has started the first meeting of
 * the fund on the Desk: the owner decides when the fund begins.
 */
export async function GET(request: Request) {
  if (!isCronAuthorised(request, process.env.CRON_SECRET)) {
    return json({ error: "unauthorized" }, 401);
  }
  const today = exchangeDate(new Date(), "Europe/London");
  if (sessionFor(today) !== today) return json({ status: "weekend" });
  if (!(await hasAnyMeeting(getFundDb()))) {
    return json({ status: "not_started" });
  }
  return json(await startAndAdvance({ asOf: today }));
}
