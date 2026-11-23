import { exchangeDate } from "../market/exchange-date.ts";

/** Today's date in London, `YYYY-MM-DD`: the date the fund's day turns on. */
export function londonToday(now = new Date()): string {
  return exchangeDate(now, "Europe/London");
}
