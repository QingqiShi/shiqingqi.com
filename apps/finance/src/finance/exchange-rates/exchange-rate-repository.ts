import { and, eq, gt, lte, max, or, sql, type SQL } from "drizzle-orm";
import { exchangeRates } from "../db/schema.ts";
import type { FinanceAppDb } from "../db/with-household.ts";
import type {
  CurrencyPair,
  ExchangeRateRow,
  ExchangeRateSource,
} from "./exchange-rate-row-schema.ts";

const WRITE_LOCK = 4_271_903_118;

/** Rows per insert: well below the 65,535 parameters of one statement. */
const INSERT_CHUNK = 5_000;

/**
 * The ECB does not publish on weekends and TARGET holidays, so its rates are
 * at most five days apart. A longer distance is a gap.
 */
const LONGEST_NORMAL_DISTANCE = 7;

const rowColumns = {
  base: exchangeRates.base,
  quote: exchangeRates.quote,
  on: exchangeRates.on,
  rate: exchangeRates.rate,
  source: sql<ExchangeRateSource>`${exchangeRates.source}`,
};

function ofPair(pair: CurrencyPair): SQL | undefined {
  return or(
    and(eq(exchangeRates.base, pair.base), eq(exchangeRates.quote, pair.quote)),
    and(eq(exchangeRates.base, pair.quote), eq(exchangeRates.quote, pair.base)),
  );
}

/**
 * The global exchange rates. They hold no Household data, so every
 * `finance_app` transaction may read them, with or without a Household.
 */
export const exchangeRateRepository = {
  async listForPairs(
    db: FinanceAppDb,
    pairs: readonly CurrencyPair[],
    afterSeq = 0,
  ): Promise<ExchangeRateRow[]> {
    if (pairs.length === 0) return [];
    return db
      .select(rowColumns)
      .from(exchangeRates)
      .where(and(gt(exchangeRates.seq, afterSeq), or(...pairs.map(ofPair))));
  },

  async lastSeq(db: FinanceAppDb): Promise<number> {
    const [row] = await db
      .select({ seq: max(exchangeRates.seq) })
      .from(exchangeRates);
    return row.seq ?? 0;
  },

  /** A rate dated after `today` does not count as the earliest or the latest. */
  async spans(
    db: FinanceAppDb,
    pairs: readonly CurrencyPair[],
    today: string,
  ): Promise<Map<string, PairSpan>> {
    const spans = new Map<string, PairSpan>();
    if (pairs.length === 0) return spans;
    const low = sql<string>`least(${exchangeRates.base}, ${exchangeRates.quote})`;
    const high = sql<string>`greatest(${exchangeRates.base}, ${exchangeRates.quote})`;
    const rows = await db
      .select({
        low,
        high,
        earliest: sql<
          string | null
        >`min(${exchangeRates.on}) filter (where ${exchangeRates.on} <= ${today})`.mapWith(
          exchangeRates.on,
        ),
        latest: sql<
          string | null
        >`max(${exchangeRates.on}) filter (where ${exchangeRates.on} <= ${today})`.mapWith(
          exchangeRates.on,
        ),
        fromLow:
          sql<number>`count(*) filter (where ${exchangeRates.base} < ${exchangeRates.quote})`.mapWith(
            Number,
          ),
        fromHigh:
          sql<number>`count(*) filter (where ${exchangeRates.base} > ${exchangeRates.quote})`.mapWith(
            Number,
          ),
      })
      .from(exchangeRates)
      .where(or(...pairs.map(ofPair)))
      .groupBy(low, high);
    for (const row of rows) {
      spans.set(unorderedPairKey({ base: row.low, quote: row.high }), {
        earliest: row.earliest,
        latest: row.latest,
        orientation:
          row.fromLow > row.fromHigh
            ? { base: row.low, quote: row.high }
            : row.fromHigh > row.fromLow
              ? { base: row.high, quote: row.low }
              : null,
      });
    }
    return spans;
  },

  /**
   * By pair: the days strictly between two consecutive rates more than
   * `LONGEST_NORMAL_DISTANCE` days apart, oldest first. Rates dated after
   * `today` do not count.
   */
  async gaps(
    db: FinanceAppDb,
    pairs: readonly CurrencyPair[],
    today: string,
  ): Promise<Map<string, DayRange[]>> {
    const gaps = new Map<string, DayRange[]>();
    if (pairs.length === 0) return gaps;
    const low = sql<string>`least(${exchangeRates.base}, ${exchangeRates.quote})`;
    const high = sql<string>`greatest(${exchangeRates.base}, ${exchangeRates.quote})`;
    const ordered = db
      .select({
        low: low.as("low"),
        high: high.as("high"),
        on: exchangeRates.on,
        next: sql<string>`lead(${exchangeRates.on}) over (partition by ${low}, ${high} order by ${exchangeRates.on})`.as(
          "next",
        ),
      })
      .from(exchangeRates)
      .where(and(lte(exchangeRates.on, today), or(...pairs.map(ofPair))))
      .as("ordered");
    const rows = await db
      .select({
        low: ordered.low,
        high: ordered.high,
        start: sql<string>`${ordered.on} + 1`.mapWith(exchangeRates.on),
        end: sql<string>`${ordered.next} - 1`.mapWith(exchangeRates.on),
      })
      .from(ordered)
      .where(sql`${ordered.next} - ${ordered.on} > ${LONGEST_NORMAL_DISTANCE}`)
      .orderBy(ordered.low, ordered.high, ordered.on);
    for (const row of rows) {
      const key = unorderedPairKey({ base: row.low, quote: row.high });
      const ranges = gaps.get(key) ?? [];
      ranges.push([row.start, row.end]);
      gaps.set(key, ranges);
    }
    return gaps;
  },

  /** Call it in its own transaction: the lock it takes holds to the end. */
  async insertNew(
    db: FinanceAppDb,
    rows: readonly ExchangeRateRow[],
  ): Promise<number> {
    if (rows.length === 0) return 0;
    // Writes take turns, so a row with a lower seq never commits after a
    // reader saw a higher one. Without that, a device that downloads only the
    // rows after its last seq could lose a row for ever.
    await db.execute(sql`select pg_advisory_xact_lock(${WRITE_LOCK})`);
    let added = 0;
    for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
      const inserted = await db
        .insert(exchangeRates)
        .values(rows.slice(start, start + INSERT_CHUNK))
        .onConflictDoNothing()
        .returning({ on: exchangeRates.on });
      added += inserted.length;
    }
    return added;
  },
};

export interface PairSpan {
  earliest: string | null;
  latest: string | null;
  /** Null when as many rows have each orientation. */
  orientation: CurrencyPair | null;
}

/** From the first day to the last day, both included. */
export type DayRange = readonly [start: string, end: string];

export function unorderedPairKey(pair: CurrencyPair) {
  return pair.base < pair.quote
    ? `${pair.base}|${pair.quote}`
    : `${pair.quote}|${pair.base}`;
}
