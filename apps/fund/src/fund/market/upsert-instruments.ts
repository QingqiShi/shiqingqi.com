import { and, eq, notInArray, sql } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import { instruments } from "../fund-schema.ts";
import { BENCHMARK, FX_SYMBOL } from "../guardrails.ts";
import type { Instrument } from "../types.ts";
import { UNIVERSE } from "./universe.ts";

const NON_STOCKS: Instrument[] = [
  {
    symbol: BENCHMARK.symbols.LSE,
    kind: "benchmark",
    name: "FTSE 100",
    exchange: "LSE",
    currency: "GBP",
    quoteScale: 1,
    sector: null,
    industry: null,
    index: null,
    active: true,
  },
  {
    symbol: BENCHMARK.symbols.US,
    kind: "benchmark",
    name: "S&P 500",
    exchange: "US",
    currency: "USD",
    quoteScale: 1,
    sector: null,
    industry: null,
    index: null,
    active: true,
  },
  {
    symbol: FX_SYMBOL,
    kind: "fx",
    name: "GBP/USD",
    exchange: null,
    currency: "USD",
    quoteScale: 1,
    sector: null,
    industry: null,
    index: null,
    active: true,
  },
];

/**
 * Writes the universe, the benchmarks and the GBPUSD rate to `instruments`.
 * A stock that left the universe stays, as inactive, for its history.
 */
export async function upsertInstruments(db: FundDb): Promise<void> {
  const rows: Instrument[] = [
    ...UNIVERSE.map((entry): Instrument => ({
      ...entry,
      kind: "stock",
      active: true,
    })),
    ...NON_STOCKS,
  ];
  await db
    .insert(instruments)
    .values(rows)
    .onConflictDoUpdate({
      target: instruments.symbol,
      set: {
        kind: sql`excluded.kind`,
        name: sql`excluded.name`,
        exchange: sql`excluded.exchange`,
        currency: sql`excluded.currency`,
        quoteScale: sql`excluded.quote_scale`,
        sector: sql`excluded.sector`,
        industry: sql`excluded.industry`,
        index: sql`excluded.index`,
        active: true,
      },
    });
  await db
    .update(instruments)
    .set({ active: false })
    .where(
      and(
        eq(instruments.kind, "stock"),
        notInArray(
          instruments.symbol,
          UNIVERSE.map((entry) => entry.symbol),
        ),
      ),
    );
}
