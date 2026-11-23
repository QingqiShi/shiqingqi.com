import type { AnalystNote } from "../contracts/analyst-note-schema.ts";
import type { MacroBrief } from "../contracts/macro-brief-schema.ts";
import { GUARDRAILS } from "../guardrails.ts";
import { optionalInstrumentOf } from "../ledger/instrument-of.ts";
import type { PlannedOrder } from "../orders/types.ts";
import type { RiskPolicyCheck } from "../risk/check-risk-policy.ts";
import type { Exposure } from "../risk/measure-exposure.ts";
import { median } from "../screener/median.ts";
import type { ScreenResult } from "../screener/screen-universe.ts";
import type {
  Instrument,
  JournalEntry,
  Order,
  ScreenRow,
  ValuedPortfolio,
} from "../types.ts";
import { cutText } from "./cut-text.ts";
import type { PmJournal } from "./journal-reads.ts";
import type { FundState } from "./load-fund-state.ts";
import { quotePrice, quoteUnit } from "./quote-price.ts";
import { roundTo } from "./round-to.ts";

const RATIONALE_CHARS = 900;
const TOP_ROWS = 15;

type Lookup = (symbol: string) => Instrument | undefined;

function portfolio(
  state: Pick<FundState, "instruments" | "asOf">,
  valued: ValuedPortfolio,
) {
  const lookup = optionalInstrumentOf(state.instruments);
  return {
    asOf: valued.asOf,
    navGbp: roundTo(valued.navGbp),
    cashGbp: roundTo(valued.cashGbp),
    cashWeightPct: roundTo(valued.cashWeightPct, 1),
    gbpUsd: roundTo(valued.gbpUsd, 4),
    realisedPnlGbp: roundTo(valued.realisedPnlGbp),
    dividendsGbp: roundTo(valued.dividendsGbp),
    positions: valued.positions.map((p) => {
      const instrument = lookup(p.symbol);
      return {
        symbol: p.symbol,
        name: instrument?.name ?? null,
        sector: instrument?.sector ?? null,
        unit: instrument ? quoteUnit(instrument) : null,
        quantity: p.quantity,
        sellableNow: p.unlockedQuantity,
        lastClose: instrument ? quotePrice(p.price, instrument) : null,
        lastCloseDate: p.priceDate,
        marketValueGbp: roundTo(p.marketValueGbp),
        weightPct: roundTo(p.weightPct, 1),
        costGbp: roundTo(p.costGbp),
        unrealisedPnlGbp: roundTo(p.unrealisedPnlGbp),
        lots: p.lots.map((lot) => ({
          boughtOn: lot.openedOn,
          unlockOn: lot.unlockOn,
          quantity: lot.quantity,
          locked: lot.unlockOn > state.asOf,
        })),
      };
    }),
  };
}

function order(o: Order, lookup: Lookup) {
  const instrument = lookup(o.symbol);
  const price = (value: number | null) =>
    instrument ? quotePrice(value, instrument) : value;
  return {
    symbol: o.symbol,
    side: o.side,
    quantity: o.quantity,
    limitPrice: price(o.limitPrice),
    unit: instrument ? quoteUnit(instrument) : null,
    placedFor: o.placedFor,
    validUntil: o.validUntil,
    status: o.status,
    checkedThrough: o.checkedThrough,
    statusNote: o.statusNote,
    onExpiry: o.onExpiry,
    repriceLimit: price(o.repriceLimit),
    unfilledPlan: o.unfilledPlan,
    rationale: cutText(o.rationale, RATIONALE_CHARS),
  };
}

function orders(state: FundState) {
  const lookup = optionalInstrumentOf(state.instruments);
  return {
    open: state.openOrders.map((o) => order(o, lookup)),
    recentlyEnded: state.recentOrders.map((o) => order(o, lookup)),
  };
}

function journalLine(entry: JournalEntry, full: boolean) {
  return {
    date: entry.date,
    symbol: entry.symbol,
    kind: entry.kind,
    summary: entry.summary,
    ...(full ? { rationale: cutText(entry.rationale, RATIONALE_CHARS) } : {}),
  };
}

/** The newest entries, then the older history of each symbol on today's table. */
function journal(pm: PmJournal) {
  const bySymbol: Record<string, ReturnType<typeof journalLine>[]> = {};
  for (const [symbol, history] of pm.olderBySymbol) {
    if (history.length > 0) {
      bySymbol[symbol] = history.map((e) => journalLine(e, true));
    }
  }
  return {
    totalEntries: pm.total,
    recent: pm.recent.map((e) => journalLine(e, true)),
    olderBySymbol: bySymbol,
  };
}

function exposure(measured: Exposure, check: RiskPolicyCheck | null) {
  const metrics = Object.fromEntries(
    Object.entries(measured.metrics).map(([k, v]) => [k, roundTo(v, 2)]),
  );
  return {
    navGbp: roundTo(measured.navGbp),
    metrics,
    bySector: measured.bySector.map((s) => ({
      sector: s.sector,
      weightPct: roundTo(s.weightPct, 1),
    })),
    byCurrency: measured.byCurrency.map((c) => ({
      currency: c.currency,
      weightPct: roundTo(c.weightPct, 1),
    })),
    positions: measured.positions.map((p) => ({
      symbol: p.symbol,
      weightPct: roundTo(p.weightPct, 1),
      beta: roundTo(p.beta, 2),
      lockedPct: roundTo(p.lockedPct, 0),
      fullyUnlockedOn: p.fullyUnlockedOn,
      nextEarningsDate: p.nextEarningsDate,
    })),
    unlockSchedule: measured.unlockSchedule.map((u) => ({
      date: u.date,
      valueGbp: roundTo(u.valueGbp),
      symbols: u.symbols,
    })),
    earningsInLock: measured.earningsInLock,
    policyCheck: check && {
      factors: check.factors.map((f) => ({
        key: f.factor.key,
        stance: f.factor.stance,
        metric: f.factor.metric,
        targetMin: f.factor.targetMin,
        targetMax: f.factor.targetMax,
        measured: roundTo(f.measured, 2),
        inside: f.inside,
        side: f.side,
      })),
      limits: check.limits.map((l) => ({
        limit: l.limit,
        bound: l.bound,
        value: l.value,
        measured: roundTo(l.measured, 2),
        holds: l.holds,
      })),
    },
  };
}

function screenRow(row: ScreenRow, rank: number, lookup: Lookup) {
  const instrument = lookup(row.symbol);
  const m = row.metrics;
  return {
    rank,
    symbol: row.symbol,
    sector: row.sector,
    composite: roundTo(row.composite, 1),
    percentiles: {
      value: roundTo(row.percentiles.value, 0),
      quality: roundTo(row.percentiles.quality, 0),
      momentum: roundTo(row.percentiles.momentum, 0),
      growth: roundTo(row.percentiles.growth, 0),
      lowVolatility: roundTo(row.percentiles.lowVolatility, 0),
    },
    lastClose: instrument ? quotePrice(m.lastClose, instrument) : null,
    unit: instrument ? quoteUnit(instrument) : null,
    return12m1mPct: roundTo(m.return12m1mPct, 1),
    return1mPct: roundTo(m.return1mPct, 1),
    vs200dmaPct: roundTo(m.vs200dmaPct, 1),
    volatility1yPct: roundTo(m.volatility1yPct, 1),
    trailingPe: roundTo(m.trailingPe, 1),
    forwardPe: roundTo(m.forwardPe, 1),
    freeCashFlowYieldPct: roundTo(m.freeCashFlowYieldPct, 1),
    returnOnEquityPct: roundTo(m.returnOnEquityPct, 1),
    profitMarginPct: roundTo(m.profitMarginPct, 1),
    revenueGrowthPct: roundTo(m.revenueGrowthPct, 1),
    earningsGrowthPct: roundTo(m.earningsGrowthPct, 1),
    marketCapGbpBn: roundTo((m.marketCapGbp ?? 0) / 1e9, 1),
    nextEarningsDate: m.nextEarningsDate,
  };
}

/** Medians of the screened universe, so that one row can be read against it. */
function universeMedians(rows: readonly ScreenRow[]) {
  const of = (pick: (m: ScreenRow["metrics"]) => number | null, digits = 1) =>
    roundTo(
      median(
        rows
          .map((r) => pick(r.metrics))
          .filter((v): v is number => v !== null && Number.isFinite(v)),
      ),
      digits,
    );
  return {
    trailingPe: of((m) => m.trailingPe),
    forwardPe: of((m) => m.forwardPe),
    freeCashFlowYieldPct: of((m) => m.freeCashFlowYieldPct),
    returnOnEquityPct: of((m) => m.returnOnEquityPct),
    profitMarginPct: of((m) => m.profitMarginPct),
    revenueGrowthPct: of((m) => m.revenueGrowthPct),
    return12m1mPct: of((m) => m.return12m1mPct),
    volatility1yPct: of((m) => m.volatility1yPct),
  };
}

/** The shortlist, the top of the screen and the rows of today's table. */
function screen(
  result: ScreenResult,
  instruments: readonly Instrument[],
  symbols: readonly string[],
  weights: unknown,
) {
  const lookup = optionalInstrumentOf(instruments);
  const rankOf = new Map(result.rows.map((row, i) => [row.symbol, i + 1]));
  const rowOf = (row: ScreenRow) =>
    screenRow(row, rankOf.get(row.symbol) ?? 0, lookup);
  const shortlist = new Set(result.shortlist.map((r) => r.symbol));
  const table = new Set(symbols);
  return {
    asOf: result.asOf,
    screened: result.rows.length,
    excluded: result.excluded.length,
    weights,
    universeMedians: universeMedians(result.rows),
    shortlist: result.shortlist.map(rowOf),
    top: result.rows
      .slice(0, TOP_ROWS)
      .filter((r) => !shortlist.has(r.symbol))
      .map(rowOf),
    onTodaysTable: result.rows
      .filter((r) => table.has(r.symbol) && !shortlist.has(r.symbol))
      .map(rowOf),
  };
}

function brief(macro: MacroBrief | null) {
  if (!macro) return "The strategist's brief is missing: the step failed.";
  const { sources: _sources, ...rest } = macro;
  return rest;
}

function notes(
  symbols: readonly string[],
  found: ReadonlyMap<string, AnalystNote>,
  failures: ReadonlyMap<string, string>,
) {
  return symbols.map((symbol) => {
    const note = found.get(symbol);
    if (note) {
      const { sources: _sources, ...rest } = note;
      return rest;
    }
    return {
      symbol,
      missing: `There is no note: the analyst failed (${failures.get(symbol) ?? "unknown"}). Decide without it, or hold.`,
    };
  });
}

function plannedOrders(
  planned: readonly PlannedOrder[],
  instruments: readonly Instrument[],
) {
  const lookup = optionalInstrumentOf(instruments);
  return planned.map((o) => {
    const instrument = lookup(o.symbol);
    const price = (value: number | null) =>
      instrument ? quotePrice(value, instrument) : value;
    return {
      symbol: o.symbol,
      side: o.side,
      quantity: o.quantity,
      limitPrice: price(o.limitPrice),
      unit: instrument ? quoteUnit(instrument) : null,
      validUntil: o.validUntil,
      onExpiry: o.onExpiry,
      repriceLimit: price(o.repriceLimit),
      estimatedValueGbp: roundTo(o.estimatedValueGbp),
      estimatedFeesGbp: roundTo(o.estimatedFeesGbp),
      weightAfterPct: roundTo(o.weightAfterPct, 1),
    };
  });
}

function policy(record: FundState["riskPolicy"]) {
  return record
    ? { version: record.version, ...record.policy }
    : "There is no risk policy yet.";
}

function guardrails() {
  return {
    ...GUARDRAILS,
    note: "The owner's hard rules. Code enforces them; no policy can loosen them.",
  };
}

/** The parts that the packs of the meeting share. */
export const packParts = {
  portfolio,
  orders,
  journal,
  exposure,
  screen,
  brief,
  notes,
  plannedOrders,
  policy,
  guardrails,
};
