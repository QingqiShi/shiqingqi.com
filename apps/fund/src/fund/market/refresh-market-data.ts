import { runTransaction } from "@tuja/server-db/run-transaction";
import { and, eq, gte, max, sql } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import {
  fundamentalsSchema,
  type Fundamentals,
} from "../contracts/fundamentals-schema.ts";
import {
  dailyBars,
  dividends,
  fundamentals,
  instruments,
} from "../fund-schema.ts";
import { addDays, formatDay } from "../ledger/add-days.ts";
import type { Bar, Instrument } from "../types.ts";
import { assertQuoteUnits } from "./assert-quote-units.ts";
import { buildFundamentals } from "./build-fundamentals.ts";
import { endedSessions } from "./ended-sessions.ts";
import { exchangeDate } from "./exchange-date.ts";
import { mapLimited } from "./map-limited.ts";
import type { MarketProvider } from "./types.ts";
import { upsertInstruments } from "./upsert-instruments.ts";
import { withRetries } from "./with-retries.ts";

const CONCURRENCY = 4;
const FUNDAMENTALS_MAX_AGE_DAYS = 7;
/** Bars fetched again before the last stored one, to see if the provider changed history. */
const OVERLAP_DAYS = 7;

export interface RefreshFailure {
  symbol: string;
  stage: "bars" | "fundamentals";
  message: string;
}

export interface RefreshSummary {
  barsAdded: number;
  dividendsAdded: number;
  fundamentalsRefreshed: number;
  failures: RefreshFailure[];
}

/** The first day of a first fetch: two years and a month before `now`. */
function historyStart(now: Date): string {
  return formatDay(
    Date.UTC(now.getUTCFullYear() - 2, now.getUTCMonth() - 1, now.getUTCDate()),
  );
}

function isSameValue(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-6 * Math.max(Math.abs(a), Math.abs(b));
}

async function refreshBars(
  db: FundDb,
  provider: MarketProvider,
  instrument: Instrument,
  { now, lastDate }: { now: Date; lastDate: string | undefined },
): Promise<{ bars: number; dividends: number }> {
  const { symbol, quoteScale } = instrument;
  async function fetchFrom(from: string) {
    const history = await withRetries(() =>
      provider.priceHistory(symbol, { from, to: now }),
    );
    assertQuoteUnits(history.quoteCurrency, instrument);
    return endedSessions(history, { now, quoteScale });
  }

  const overlapStart = lastDate && addDays(lastDate, -OVERLAP_DAYS);
  let fetched = await fetchFrom(overlapStart ?? historyStart(now));
  let rewrite = false;
  if (lastDate && overlapStart) {
    const stored = await db
      .select({
        date: dailyBars.date,
        close: dailyBars.close,
        adjClose: dailyBars.adjClose,
      })
      .from(dailyBars)
      .where(
        and(eq(dailyBars.symbol, symbol), gte(dailyBars.date, overlapStart)),
      );
    const fetchedByDate = new Map(fetched.bars.map((bar) => [bar.date, bar]));
    // A provider adjusts all past prices after a dividend or a split, so
    // stored bars that no longer match are written again in full.
    rewrite = stored.some((row) => {
      const bar = fetchedByDate.get(row.date);
      return (
        bar !== undefined &&
        (!isSameValue(bar.close, row.close) ||
          !isSameValue(bar.adjClose, row.adjClose))
      );
    });
    if (rewrite) fetched = await fetchFrom(historyStart(now));
  }

  const newBars = fetched.bars.filter(
    (bar) => lastDate === undefined || bar.date > lastDate,
  );
  const toRow = (bar: Bar) => ({ symbol, ...bar });
  return runTransaction(db, async (tx) => {
    if (rewrite) {
      await tx
        .insert(dailyBars)
        .values(fetched.bars.map(toRow))
        .onConflictDoUpdate({
          target: [dailyBars.symbol, dailyBars.date],
          set: {
            open: sql`excluded.open`,
            high: sql`excluded.high`,
            low: sql`excluded.low`,
            close: sql`excluded.close`,
            adjClose: sql`excluded.adj_close`,
            volume: sql`excluded.volume`,
          },
        });
    } else if (newBars.length > 0) {
      await tx
        .insert(dailyBars)
        .values(newBars.map(toRow))
        .onConflictDoNothing();
    }
    const addedDividends =
      fetched.dividends.length === 0
        ? []
        : await tx
            .insert(dividends)
            .values(fetched.dividends.map((row) => ({ symbol, ...row })))
            .onConflictDoNothing()
            .returning({ exDate: dividends.exDate });
    return { bars: newBars.length, dividends: addedDividends.length };
  });
}

async function refreshFundamentals(
  db: FundDb,
  provider: MarketProvider,
  instrument: Instrument,
  {
    now,
    today,
    fxRate,
  }: {
    now: Date;
    today: string;
    fxRate: (from: string, to: string) => Promise<number>;
  },
): Promise<void> {
  const raw = await withRetries(() =>
    provider.fundamentals(instrument.symbol, now),
  );
  assertQuoteUnits(raw.quoteCurrency, instrument);
  const data: Fundamentals = fundamentalsSchema.parse(
    buildFundamentals(raw, {
      quoteScale: instrument.quoteScale,
      today,
      rates: {
        toFinancial: raw.financialCurrency
          ? await fxRate(instrument.currency, raw.financialCurrency)
          : null,
        toGbp: await fxRate(instrument.currency, "GBP"),
      },
    }),
  );
  await db
    .insert(fundamentals)
    .values({ symbol: instrument.symbol, fetchedOn: today, data })
    .onConflictDoUpdate({
      target: [fundamentals.symbol, fundamentals.fetchedOn],
      set: { data },
    });
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Brings the instruments, bars, dividends and fundamentals up to date from
 * `provider`. `symbols` limits the stocks; the benchmarks and the GBPUSD rate
 * are always refreshed. One symbol that fails does not stop the others.
 */
export async function refreshMarketData(
  db: FundDb,
  {
    now,
    provider,
    symbols,
    forceFundamentals = false,
  }: {
    now: Date;
    provider: MarketProvider;
    symbols?: readonly string[];
    forceFundamentals?: boolean;
  },
): Promise<RefreshSummary> {
  await upsertInstruments(db);
  const all = await db.select().from(instruments);
  const lastBarDates = new Map(
    (
      await db
        .select({ symbol: dailyBars.symbol, date: max(dailyBars.date) })
        .from(dailyBars)
        .groupBy(dailyBars.symbol)
    ).map((row) => [row.symbol, row.date ?? undefined]),
  );
  const lastFundamentals = new Map(
    (
      await db
        .select({
          symbol: fundamentals.symbol,
          fetchedOn: max(fundamentals.fetchedOn),
        })
        .from(fundamentals)
        .groupBy(fundamentals.symbol)
    ).map((row) => [row.symbol, row.fetchedOn]),
  );

  const summary: RefreshSummary = {
    barsAdded: 0,
    dividendsAdded: 0,
    fundamentalsRefreshed: 0,
    failures: [],
  };
  const wanted = symbols && new Set(symbols);
  for (const symbol of wanted ?? []) {
    if (!all.some((instrument) => instrument.symbol === symbol)) {
      summary.failures.push({
        symbol,
        stage: "bars",
        message: "Not an instrument of the fund",
      });
    }
  }
  const targets = all.filter((instrument) =>
    instrument.kind === "stock"
      ? wanted
        ? wanted.has(instrument.symbol)
        : instrument.active
      : true,
  );

  const today = exchangeDate(now, "Europe/London");
  const rates = new Map<string, Promise<number>>();
  function fxRate(from: string, to: string): Promise<number> {
    if (from === to) return Promise.resolve(1);
    const key = `${from}${to}`;
    let rate = rates.get(key);
    if (!rate) {
      rate = withRetries(() => provider.fxRate(from, to));
      rates.set(key, rate);
    }
    return rate;
  }
  function isFundamentalsDue(symbol: string): boolean {
    const fetchedOn = lastFundamentals.get(symbol);
    return (
      forceFundamentals ||
      !fetchedOn ||
      addDays(fetchedOn, FUNDAMENTALS_MAX_AGE_DAYS) <= today
    );
  }

  await mapLimited(targets, CONCURRENCY, async (instrument) => {
    const { symbol } = instrument;
    try {
      const added = await refreshBars(db, provider, instrument, {
        now,
        lastDate: lastBarDates.get(symbol),
      });
      summary.barsAdded += added.bars;
      summary.dividendsAdded += added.dividends;
    } catch (error) {
      summary.failures.push({
        symbol,
        stage: "bars",
        message: messageOf(error),
      });
    }
    if (instrument.kind !== "stock" || !isFundamentalsDue(symbol)) return;
    try {
      await refreshFundamentals(db, provider, instrument, {
        now,
        today,
        fxRate,
      });
      summary.fundamentalsRefreshed += 1;
    } catch (error) {
      summary.failures.push({
        symbol,
        stage: "fundamentals",
        message: messageOf(error),
      });
    }
  });
  return summary;
}
