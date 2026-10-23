import { and, eq, gt, max, or, sql, type SQL } from "drizzle-orm";
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

export function unorderedPairKey(pair: CurrencyPair) {
  return pair.base < pair.quote
    ? `${pair.base}|${pair.quote}`
    : `${pair.quote}|${pair.base}`;
}
