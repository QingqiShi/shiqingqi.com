import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import { dailyBars, instruments } from "../fund-schema.ts";
import type { Bar, BarsBySymbol } from "../types.ts";

/**
 * The last `sessions` bars of each symbol before the date `before`, oldest
 * first. `before` is the date of the meeting, which never sees its own
 * session. A symbol with no bars maps to an empty list.
 */
export async function getBars(
  db: FundDb,
  symbols: readonly string[],
  { before, sessions }: { before: string; sessions: number },
): Promise<BarsBySymbol> {
  const bySymbol = new Map<string, Bar[]>(
    symbols.map((symbol) => [symbol, []]),
  );
  if (symbols.length === 0) return bySymbol;
  const last = db
    .select({
      symbol: dailyBars.symbol,
      date: dailyBars.date,
      open: dailyBars.open,
      high: dailyBars.high,
      low: dailyBars.low,
      close: dailyBars.close,
      adjClose: dailyBars.adjClose,
      volume: dailyBars.volume,
    })
    .from(dailyBars)
    .where(
      and(eq(dailyBars.symbol, instruments.symbol), lt(dailyBars.date, before)),
    )
    .orderBy(desc(dailyBars.date))
    .limit(sessions)
    .as("recent");
  const rows = await db
    .select({
      symbol: last.symbol,
      date: last.date,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      adjClose: last.adjClose,
      volume: last.volume,
    })
    .from(instruments)
    .crossJoinLateral(last)
    .where(inArray(instruments.symbol, symbols))
    .orderBy(asc(last.symbol), asc(last.date));
  for (const { symbol, ...bar } of rows) {
    bySymbol.get(symbol)?.push(bar);
  }
  return bySymbol;
}
