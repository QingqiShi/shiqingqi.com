import { toMajorUnits } from "../orders/to-major-units.ts";
import type { Bar } from "../types.ts";
import { exchangeDate } from "./exchange-date.ts";
import type { PriceHistory } from "./types.ts";

/**
 * The bars of sessions that ended by `now` and the dividends, keyed by the
 * date at the exchange and in major units. The provider's last bar is live
 * while its session runs, so it is left out until the session ends.
 */
export function endedSessions(
  history: PriceHistory,
  { now, quoteScale }: { now: Date; quoteScale: number },
): { bars: Bar[]; dividends: { exDate: string; amount: number }[] } {
  const { timeZone, regularSession } = history;
  const units = { quoteScale };
  const sessionDate = exchangeDate(new Date(regularSession.start), timeZone);
  const sessionEnded = now.getTime() >= Date.parse(regularSession.end);
  const byDate = new Map<string, Bar>();
  for (const {
    time,
    open,
    high,
    low,
    close,
    adjClose,
    volume,
  } of history.bars) {
    if (open === null || high === null || low === null || close === null) {
      continue;
    }
    const date = exchangeDate(new Date(time), timeZone);
    if (date > sessionDate || (date === sessionDate && !sessionEnded)) {
      continue;
    }
    byDate.set(date, {
      date,
      open: toMajorUnits(open, units),
      high: toMajorUnits(high, units),
      low: toMajorUnits(low, units),
      close: toMajorUnits(close, units),
      adjClose: toMajorUnits(adjClose ?? close, units),
      volume: volume ?? 0,
    });
  }
  return {
    bars: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    dividends: history.dividends.map(({ time, amount }) => ({
      exDate: exchangeDate(new Date(time), timeZone),
      amount: toMajorUnits(amount, units),
    })),
  };
}
