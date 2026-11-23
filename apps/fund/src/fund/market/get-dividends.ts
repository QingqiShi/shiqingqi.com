import { and, asc, gte, inArray, lt } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import { dividends } from "../fund-schema.ts";
import type { Dividend } from "../types.ts";

/** The dividends of `symbols` with an ex-date from `from` to the day before `before`, oldest first. */
export async function getDividends(
  db: FundDb,
  symbols: readonly string[],
  { from, before }: { from: string; before: string },
): Promise<Dividend[]> {
  if (symbols.length === 0) return [];
  return db
    .select()
    .from(dividends)
    .where(
      and(
        inArray(dividends.symbol, symbols),
        gte(dividends.exDate, from),
        lt(dividends.exDate, before),
      ),
    )
    .orderBy(asc(dividends.exDate), asc(dividends.symbol));
}
