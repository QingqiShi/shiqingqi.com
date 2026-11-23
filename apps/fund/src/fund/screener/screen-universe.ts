import type { ScreenWeights } from "../contracts/fund-thesis-schema.ts";
import type { Fundamentals } from "../contracts/fundamentals-schema.ts";
import { toGbp } from "../ledger/to-gbp.ts";
import type {
  BarsBySymbol,
  FxSeries,
  Instrument,
  ScreenRow,
} from "../types.ts";
import { percentileRanks } from "./percentile-ranks.ts";
import { priceSignals, type PriceSignals } from "./price-signals.ts";
import {
  SCREEN_RULES,
  type ScoreInput,
  type ScoreName,
} from "./screen-rules.ts";

export interface ScreenUniverseInput {
  /** Benchmarks and the FX rate may be in the list; only stocks are screened. */
  instruments: readonly Instrument[];
  bars: BarsBySymbol;
  fundamentals: ReadonlyMap<string, Fundamentals>;
  /** For the traded value of US stocks; the newest rate is used. */
  fx: FxSeries;
  weights: ScreenWeights;
  held: ReadonlySet<string>;
  asOf: string;
  shortlistSize?: number;
}

export type ScreenExclusionReason =
  "inactive" | "history" | "liquidity" | "fundamentals" | "market_cap";

/** A stock that failed a rule. `measured` and `required` are in the unit of the rule. */
export interface ScreenExclusion {
  symbol: string;
  reason: ScreenExclusionReason;
  measured: number | null;
  required: number | null;
}

export interface ScreenResult {
  asOf: string;
  rows: ScreenRow[];
  /** The best stocks the fund does not hold, within the sector cap. */
  shortlist: ScreenRow[];
  excluded: ScreenExclusion[];
}

interface Candidate {
  instrument: Instrument;
  sector: string;
  fundamentals: Fundamentals;
  signals: PriceSignals;
}

const SCORE_NAMES: readonly ScoreName[] = [
  "value",
  "quality",
  "momentum",
  "growth",
  "lowVolatility",
];

export function screenUniverse({
  instruments,
  bars,
  fundamentals,
  fx,
  weights,
  held,
  asOf,
  shortlistSize = SCREEN_RULES.shortlist.defaultSize,
}: ScreenUniverseInput): ScreenResult {
  const { eligibility } = SCREEN_RULES;
  const gbpUsd = fx.at(-1)?.gbpUsd ?? null;
  const excluded: ScreenExclusion[] = [];
  const candidates: Candidate[] = [];

  for (const instrument of instruments) {
    if (instrument.kind !== "stock") continue;
    const exclude = (
      reason: ScreenExclusionReason,
      measured: number | null,
      required: number | null,
    ) => {
      excluded.push({ symbol: instrument.symbol, reason, measured, required });
    };
    if (!instrument.active) {
      exclude("inactive", null, null);
      continue;
    }
    const signals = priceSignals(bars.get(instrument.symbol) ?? []);
    if (signals.sessions < eligibility.minHistorySessions) {
      exclude("history", signals.sessions, eligibility.minHistorySessions);
      continue;
    }
    const fxRate = instrument.currency === "USD" ? gbpUsd : 1;
    const tradedValueGbp =
      signals.medianTradedValue === null || fxRate === null
        ? null
        : toGbp(signals.medianTradedValue, instrument, fxRate);
    if (
      tradedValueGbp === null ||
      tradedValueGbp < eligibility.minMedianTradedValueGbp
    ) {
      exclude("liquidity", tradedValueGbp, eligibility.minMedianTradedValueGbp);
      continue;
    }
    const stockFundamentals = fundamentals.get(instrument.symbol);
    if (stockFundamentals === undefined) {
      exclude("fundamentals", null, null);
      continue;
    }
    const marketCapGbp = stockFundamentals.marketCapGbp;
    if (marketCapGbp === null || marketCapGbp < eligibility.minMarketCapGbp) {
      exclude("market_cap", marketCapGbp, eligibility.minMarketCapGbp);
      continue;
    }
    candidates.push({
      instrument,
      sector: instrument.sector ?? SCREEN_RULES.unknownSector,
      fundamentals: stockFundamentals,
      signals,
    });
  }

  const score = (name: ScoreName) => scoreOf(name, candidates);
  const scores: Record<ScoreName, number[]> = {
    value: score("value"),
    quality: score("quality"),
    momentum: score("momentum"),
    growth: score("growth"),
    lowVolatility: score("lowVolatility"),
  };
  const scoreWeights = normaliseWeights(weights);
  const rows = candidates.map((candidate, index): ScreenRow => {
    const percentiles: ScreenRow["percentiles"] = {
      value: scores.value[index],
      quality: scores.quality[index],
      momentum: scores.momentum[index],
      growth: scores.growth[index],
      lowVolatility: scores.lowVolatility[index],
    };
    const composite = SCORE_NAMES.reduce(
      (sum, name) => sum + percentiles[name] * scoreWeights[name],
      0,
    );
    return {
      symbol: candidate.instrument.symbol,
      sector: candidate.sector,
      composite,
      percentiles,
      metrics: metricsOf(candidate, asOf),
    };
  });
  rows.sort(
    (a, b) =>
      b.composite - a.composite ||
      (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0),
  );

  return {
    asOf,
    rows,
    shortlist: shortlistOf(rows, held, shortlistSize),
    excluded,
  };
}

function scoreOf(name: ScoreName, candidates: readonly Candidate[]): number[] {
  const inputs: readonly { input: ScoreInput; better: "higher" | "lower" }[] =
    SCREEN_RULES.scores[name];
  const ranks = inputs.map(({ input, better }) =>
    percentileRanks(
      candidates.map((candidate) => inputOf(input, candidate)),
      better,
    ),
  );
  return candidates.map((_, index) => {
    const present = ranks
      .map((rank) => rank[index])
      .filter((rank) => rank !== null);
    return present.length === 0
      ? SCREEN_RULES.neutralScore
      : present.reduce((sum, rank) => sum + rank, 0) / present.length;
  });
}

function inputOf(input: ScoreInput, candidate: Candidate): number | null {
  const { fundamentals: data, signals } = candidate;
  switch (input) {
    case "earningsYield":
      return earningsYield(data.trailingPe, data.trailingEps);
    case "forwardEarningsYield":
      return earningsYield(data.forwardPe, data.forwardEps);
    case "freeCashFlowYield":
      return data.freeCashFlowYield;
    case "returnOnEquity":
      return data.returnOnEquity;
    case "profitMargin":
      return data.profitMargin;
    case "debtToEquity":
      // A negative ratio comes from negative equity. That is the worst
      // balance sheet, not the least debt.
      return data.debtToEquity !== null && data.debtToEquity < 0
        ? Number.POSITIVE_INFINITY
        : data.debtToEquity;
    case "return12m1m":
      return signals.return12m1m;
    case "vs200dma":
      return signals.vs200dma;
    case "revenueGrowth":
      return data.revenueGrowth;
    case "earningsGrowth":
      return data.earningsGrowth;
    case "volatility1y":
      return signals.volatility1y;
  }
}

/** A loss ranks below every profit; a missing number is null. */
function earningsYield(pe: number | null, eps: number | null): number | null {
  if (pe !== null && pe > 0) return 1 / pe;
  if ((pe !== null && pe <= 0) || (eps !== null && eps <= 0)) {
    return Number.NEGATIVE_INFINITY;
  }
  return null;
}

function normaliseWeights(weights: ScreenWeights): ScreenWeights {
  const total = SCORE_NAMES.reduce((sum, name) => sum + weights[name], 0);
  const share = (name: ScoreName) =>
    total > 0 ? weights[name] / total : 1 / SCORE_NAMES.length;
  return {
    value: share("value"),
    quality: share("quality"),
    momentum: share("momentum"),
    growth: share("growth"),
    lowVolatility: share("lowVolatility"),
  };
}

function shortlistOf(
  rows: readonly ScreenRow[],
  held: ReadonlySet<string>,
  size: number,
): ScreenRow[] {
  const { maxPerSector } = SCREEN_RULES.shortlist;
  const perSector = new Map<string, number>();
  const shortlist: ScreenRow[] = [];
  for (const row of rows) {
    if (shortlist.length >= size) break;
    if (held.has(row.symbol)) continue;
    const inSector = perSector.get(row.sector) ?? 0;
    if (inSector >= maxPerSector) continue;
    perSector.set(row.sector, inSector + 1);
    shortlist.push(row);
  }
  return shortlist;
}

function metricsOf(candidate: Candidate, asOf: string): ScreenRow["metrics"] {
  const { fundamentals: data, signals } = candidate;
  const pct = (fraction: number | null) =>
    fraction === null ? null : fraction * 100;
  return {
    lastClose: signals.lastClose ?? 0,
    return12m1mPct: pct(signals.return12m1m),
    return1mPct: pct(signals.return1m),
    vs200dmaPct: pct(signals.vs200dma),
    volatility1yPct: pct(signals.volatility1y),
    trailingPe: data.trailingPe,
    forwardPe: data.forwardPe,
    freeCashFlowYieldPct: pct(data.freeCashFlowYield),
    returnOnEquityPct: pct(data.returnOnEquity),
    profitMarginPct: pct(data.profitMargin),
    revenueGrowthPct: pct(data.revenueGrowth),
    earningsGrowthPct: pct(data.earningsGrowth),
    marketCapGbp: data.marketCapGbp,
    nextEarningsDate:
      data.nextEarningsDate !== null && data.nextEarningsDate >= asOf
        ? data.nextEarningsDate
        : null,
  };
}
