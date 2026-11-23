import type { Fundamentals } from "../contracts/fundamentals-schema.ts";
import type { RiskMetric } from "../contracts/risk-policy-schema.ts";
import { BENCHMARK } from "../guardrails.ts";
import { instrumentOf } from "../ledger/instrument-of.ts";
import { SCREEN_RULES } from "../screener/screen-rules.ts";
import type {
  BarsBySymbol,
  FxSeries,
  Instrument,
  ScreenRow,
  ValuedPortfolio,
  ValuedPosition,
} from "../types.ts";
import { portfolioVolatility } from "./portfolio-volatility.ts";
import { stockBeta } from "./stock-beta.ts";

export type Exchange = keyof typeof BENCHMARK.symbols;
export type Currency = "GBP" | "USD";

export interface MeasureExposureInput {
  portfolio: ValuedPortfolio;
  instruments: readonly Instrument[];
  /** Must hold the bars of the held stocks and of the two index benchmarks. */
  bars: BarsBySymbol;
  fx: FxSeries;
  screenRows: readonly ScreenRow[];
  fundamentals: ReadonlyMap<string, Pick<Fundamentals, "nextEarningsDate">>;
  asOf: string;
}

export interface PositionExposure {
  symbol: string;
  sector: string;
  exchange: Exchange;
  currency: Currency;
  weightPct: number;
  marketValueGbp: number;
  /** Against the index of its own market; null when the sample is too small. */
  beta: number | null;
  /** The share of the position's shares that cannot be sold yet. */
  lockedPct: number;
  lockedValueGbp: number;
  /** The date on which the last locked share of the position unlocks. */
  fullyUnlockedOn: string | null;
  nextEarningsDate: string | null;
}

export interface Exposure {
  asOf: string;
  navGbp: number;
  metrics: Record<RiskMetric, number | null>;
  /** Invested weight by sector, largest first. Cash is not a sector. */
  bySector: { sector: string; weightPct: number }[];
  /** Weight of NAV by currency; cash counts as GBP. */
  byCurrency: { currency: Currency; weightPct: number }[];
  positions: PositionExposure[];
  /** The GBP value of shares that unlock on each date, oldest first. */
  unlockSchedule: { date: string; valueGbp: number; symbols: string[] }[];
  /** Positions with an earnings report on or before their newest lot unlocks. */
  earningsInLock: {
    symbol: string;
    nextEarningsDate: string;
    unlockOn: string;
  }[];
}

export function measureExposure({
  portfolio,
  instruments,
  bars,
  fx,
  screenRows,
  fundamentals,
  asOf,
}: MeasureExposureInput): Exposure {
  const instrumentFor = instrumentOf(instruments);
  const rowBySymbol = new Map(screenRows.map((row) => [row.symbol, row]));
  const navGbp = portfolio.navGbp;
  const pctOfNav = (valueGbp: number) =>
    navGbp > 0 ? (valueGbp / navGbp) * 100 : 0;

  const positions = portfolio.positions.map((position): PositionExposure => {
    const instrument = instrumentFor(position.symbol);
    const exchange = exchangeOf(instrument);
    const lockedLots = position.lots.filter((lot) => lot.unlockOn > asOf);
    const lockedQuantity = lockedLots.reduce(
      (sum, lot) => sum + lot.quantity,
      0,
    );
    const nextEarningsDate =
      upcoming(fundamentals.get(position.symbol)?.nextEarningsDate, asOf) ??
      upcoming(
        rowBySymbol.get(position.symbol)?.metrics.nextEarningsDate,
        asOf,
      );
    return {
      symbol: position.symbol,
      sector: instrument.sector ?? SCREEN_RULES.unknownSector,
      exchange,
      currency: instrument.currency,
      weightPct: position.weightPct,
      marketValueGbp: position.marketValueGbp,
      beta: stockBeta(
        bars.get(position.symbol) ?? [],
        bars.get(BENCHMARK.symbols[exchange]) ?? [],
      ),
      lockedPct: (lockedQuantity / position.quantity) * 100,
      lockedValueGbp: lockedQuantity * gbpPerShare(position),
      fullyUnlockedOn: lockedLots.reduce<string | null>(
        (latest, lot) =>
          latest === null || lot.unlockOn > latest ? lot.unlockOn : latest,
        null,
      ),
      nextEarningsDate,
    };
  });

  const bySector = sumBy(positions, (position) => position.sector)
    .map(([sector, weightPct]) => ({ sector, weightPct }))
    .sort((a, b) => b.weightPct - a.weightPct);
  const usdWeightPct = positions
    .filter((position) => position.currency === "USD")
    .reduce((sum, position) => sum + position.weightPct, 0);
  const byCurrency: Exposure["byCurrency"] = [
    { currency: "GBP", weightPct: 100 - usdWeightPct },
    { currency: "USD", weightPct: usdWeightPct },
  ];

  const unlockSchedule = new Map<
    string,
    { valueGbp: number; symbols: Set<string> }
  >();
  for (const position of portfolio.positions) {
    for (const lot of position.lots) {
      if (lot.unlockOn <= asOf) continue;
      const entry = unlockSchedule.get(lot.unlockOn) ?? {
        valueGbp: 0,
        symbols: new Set<string>(),
      };
      entry.valueGbp += lot.quantity * gbpPerShare(position);
      entry.symbols.add(position.symbol);
      unlockSchedule.set(lot.unlockOn, entry);
    }
  }

  const earningsInLock = positions.flatMap((position) =>
    position.nextEarningsDate !== null &&
    position.fullyUnlockedOn !== null &&
    position.nextEarningsDate <= position.fullyUnlockedOn
      ? [
          {
            symbol: position.symbol,
            nextEarningsDate: position.nextEarningsDate,
            unlockOn: position.fullyUnlockedOn,
          },
        ]
      : [],
  );

  const annualVolatilityPct = portfolioVolatility({
    holdings: positions.map((position) => ({
      bars: bars.get(position.symbol) ?? [],
      currency: position.currency,
      weight: position.weightPct / 100,
    })),
    calendar: commonCalendar(positions, bars),
    fx,
  });

  const tilt = (score: keyof ScreenRow["percentiles"]) => {
    let weight = 0;
    let weighted = 0;
    for (const position of positions) {
      const row = rowBySymbol.get(position.symbol);
      if (row === undefined) continue;
      weight += position.weightPct;
      weighted += position.weightPct * row.percentiles[score];
    }
    return weight > 0 ? weighted / weight - 50 : null;
  };

  return {
    asOf,
    navGbp,
    metrics: {
      equity_beta: equityBeta(positions),
      annual_volatility_pct: annualVolatilityPct,
      cash_weight_pct: portfolio.cashWeightPct,
      largest_position_pct: Math.max(
        0,
        ...positions.map((position) => position.weightPct),
      ),
      largest_sector_pct: bySector[0]?.weightPct ?? 0,
      usd_weight_pct: usdWeightPct,
      locked_weight_pct: pctOfNav(
        positions.reduce((sum, position) => sum + position.lockedValueGbp, 0),
      ),
      position_count: positions.length,
      value_tilt: tilt("value"),
      quality_tilt: tilt("quality"),
      momentum_tilt: tilt("momentum"),
      growth_tilt: tilt("growth"),
      low_volatility_tilt: tilt("lowVolatility"),
    },
    bySector,
    byCurrency,
    positions,
    unlockSchedule: [...unlockSchedule]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, entry]) => ({
        date,
        valueGbp: entry.valueGbp,
        symbols: [...entry.symbols].sort(),
      })),
    earningsInLock,
  };
}

/** Null when a held stock has no measured beta. */
function equityBeta(positions: readonly PositionExposure[]): number | null {
  let beta = 0;
  for (const position of positions) {
    if (position.beta === null) return null;
    beta += (position.weightPct / 100) * position.beta;
  }
  return beta;
}

function exchangeOf(instrument: Instrument): Exchange {
  return instrument.exchange ?? (instrument.currency === "GBP" ? "LSE" : "US");
}

function gbpPerShare(position: ValuedPosition): number {
  return position.marketValueGbp / position.quantity;
}

function upcoming(
  date: string | null | undefined,
  asOf: string,
): string | null {
  return date !== null && date !== undefined && date >= asOf ? date : null;
}

function sumBy<T extends { weightPct: number }>(
  items: readonly T[],
  keyOf: (item: T) => string,
): [string, number][] {
  const sums = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    sums.set(key, (sums.get(key) ?? 0) + item.weightPct);
  }
  return [...sums];
}

/**
 * The dates on which every market of the held stocks traded. A market's
 * dates are those of its index, or of its held stocks when the index has
 * no bars.
 */
function commonCalendar(
  positions: readonly PositionExposure[],
  bars: BarsBySymbol,
): string[] {
  const exchanges = new Map<Exchange, string[]>();
  for (const position of positions) {
    exchanges.set(position.exchange, [
      ...(exchanges.get(position.exchange) ?? []),
      position.symbol,
    ]);
  }
  const marketDates = [...exchanges].map(([exchange, symbols]) => {
    const indexBars = bars.get(BENCHMARK.symbols[exchange]) ?? [];
    const sources =
      indexBars.length > 0
        ? [indexBars]
        : symbols.map((symbol) => bars.get(symbol) ?? []);
    return new Set(sources.flatMap((source) => source.map((bar) => bar.date)));
  });
  if (marketDates.length === 0) return [];
  const [first, ...others] = marketDates;
  return [...first]
    .filter((date) => others.every((dates) => dates.has(date)))
    .sort();
}
