import { asc } from "drizzle-orm";
import "server-only";
import type { FundDb } from "#src/db/types.ts";
import { modelTierFromEnv, type ModelTier } from "../agents/model-for.ts";
import { cashEntries, fills } from "../fund-schema.ts";
import { BENCHMARK, GUARDRAILS } from "../guardrails.ts";
import { addDays, parseDay } from "../ledger/add-days.ts";
import { derivePortfolio } from "../ledger/derive-portfolio.ts";
import { navSeries, type NavPoint } from "../ledger/nav-series.ts";
import { valuePortfolio } from "../ledger/value-portfolio.ts";
import { getBars } from "../market/get-bars.ts";
import { getFxSeries } from "../market/get-fx-series.ts";
import { getInstruments } from "../market/get-instruments.ts";
import type {
  BarsBySymbol,
  Fill,
  FxSeries,
  Instrument,
  ValuedPortfolio,
} from "../types.ts";
import { londonToday } from "./london-today.ts";

export interface FundState {
  /** Today's date in London. */
  today: string;
  instruments: Instrument[];
  fills: Fill[];
  /** The date of the first deposit; null before the fund has money. */
  startedOn: string | null;
  /** The money put in, or the mandate before the first deposit. */
  depositsGbp: number;
  portfolio: ValuedPortfolio;
  /** USD for one GBP at the last close; null when no rate is stored. */
  gbpUsd: number | null;
  /**
   * The closes it loaded, oldest first: at least the last one of each held
   * stock. With `history: "none"`, `sessions` closes of each held stock and
   * of both indices.
   */
  bars: BarsBySymbol;
  /** The GBPUSD rates it loaded; with `history: "none"`, `sessions` of them. */
  fx: FxSeries;
  /** The NAV and the benchmark at each close since the first deposit; empty unless `history` is `nav`. */
  history: NavPoint[];
  /** The fund's return since the start, in percent; null before the start. */
  returnPct: number | null;
  /** The benchmark's return over the same days, in percent; null when `history` is `none`. */
  benchmarkReturnPct: number | null;
  modelTier: ModelTier;
}

export interface FundStateOptions {
  /**
   * `nav`: the NAV and the benchmark at each close since the start, for the
   * chart. `return`: only what the benchmark's return needs. `none`: neither.
   */
  history: "nav" | "return" | "none";
  /** With `history: "none"`, the closes of each held stock, both indices and GBPUSD to load. */
  sessions?: number;
  /** Today's date in London; the clock when left out. */
  today?: string;
}

const DAY_MS = 86_400_000;
const BENCHMARK_SYMBOLS = [BENCHMARK.symbols.LSE, BENCHMARK.symbols.US];

/**
 * Everything the pages share about the fund today: the ledger, the
 * portfolio valued at the last closes, and its return against the
 * benchmark. Every page reads it, so the figures on each tab agree.
 */
export async function loadFundState(
  db: FundDb,
  { history: wanted, sessions = 1, today = londonToday() }: FundStateOptions,
): Promise<FundState> {
  const tomorrow = addDays(today, 1);
  const [instruments, fillRows, cashRows] = await Promise.all([
    getInstruments(db),
    db.select().from(fills).orderBy(asc(fills.filledOn), asc(fills.createdAt)),
    db.select().from(cashEntries).orderBy(asc(cashEntries.date)),
  ]);
  const deposits = cashRows.filter((entry) => entry.kind === "deposit");
  const startedOn = deposits.at(0)?.date ?? null;
  const depositsGbp =
    startedOn === null
      ? GUARDRAILS.startingCashGbp
      : deposits.reduce((sum, entry) => sum + entry.amountGbp, 0);
  const derived = derivePortfolio({
    fills: fillRows,
    cashEntries: cashRows,
    asOf: today,
  });
  const held = derived.positions.map((position) => position.symbol);

  const sinceStart =
    startedOn === null
      ? 1
      : Math.ceil((parseDay(tomorrow) - parseDay(startedOn)) / DAY_MS) + 10;
  const barsOf = (symbols: readonly string[], count: number) =>
    getBars(db, symbols, { before: tomorrow, sessions: count });
  const fxOf = (count: number) =>
    getFxSeries(db, { before: tomorrow, sessions: Math.max(count, 5) });

  let bars: BarsBySymbol;
  let fx: FxSeries;
  if (wanted === "nav") {
    const traded = [...new Set(fillRows.map((fill) => fill.symbol))];
    [bars, fx] = await Promise.all([
      barsOf([...traded, ...BENCHMARK_SYMBOLS], sinceStart),
      fxOf(sinceStart),
    ]);
  } else if (wanted === "return") {
    const [heldBars, indexBars, rates] = await Promise.all([
      barsOf(held, 1),
      barsOf(BENCHMARK_SYMBOLS, sinceStart),
      fxOf(sinceStart),
    ]);
    bars = new Map([...heldBars, ...indexBars]);
    fx = rates;
  } else {
    [bars, fx] = await Promise.all([
      barsOf([...held, ...BENCHMARK_SYMBOLS], sessions),
      fxOf(sessions),
    ]);
  }
  const gbpUsd = fx.at(-1)?.gbpUsd ?? null;
  const portfolio = valuePortfolio(derived, {
    instruments,
    bars,
    gbpUsd: gbpUsd ?? 1,
  });

  let series: NavPoint[] = [];
  if (wanted !== "none" && startedOn !== null && fx.length > 0) {
    const nav = { cashEntries: cashRows, instruments, fx, from: startedOn };
    if (wanted === "nav") {
      series = navSeries({ ...nav, fills: fillRows, bars, to: today });
    } else {
      // The benchmark starts at the NAV of the first session and then
      // follows only the two indices. Thus the fills up to that session
      // give the same benchmark, without the history of each stock.
      const firstSession = BENCHMARK_SYMBOLS.flatMap(
        (symbol) => bars.get(symbol) ?? [],
      )
        .map((bar) => bar.date)
        .filter((date) => date >= startedOn && date <= today)
        .sort()
        .at(0);
      const early = fillRows.filter(
        (fill) => firstSession !== undefined && fill.filledOn <= firstSession,
      );
      const earlySymbols = [...new Set(early.map((fill) => fill.symbol))];
      const earlyBars =
        earlySymbols.length === 0
          ? bars
          : new Map([...bars, ...(await barsOf(earlySymbols, sinceStart))]);
      series = navSeries({ ...nav, fills: early, bars: earlyBars, to: today });
    }
  }
  const first = series.at(0);
  const last = series.at(-1);

  return {
    today,
    instruments,
    fills: fillRows,
    startedOn,
    depositsGbp,
    portfolio,
    gbpUsd,
    bars,
    fx,
    history: wanted === "nav" ? series : [],
    returnPct:
      startedOn === null ? null : (portfolio.navGbp / depositsGbp - 1) * 100,
    benchmarkReturnPct:
      first === undefined || last === undefined || first.benchmarkGbp === 0
        ? null
        : (last.benchmarkGbp / first.benchmarkGbp - 1) * 100,
    modelTier: modelTierFromEnv(process.env.FUND_MODEL_TIER),
  };
}
