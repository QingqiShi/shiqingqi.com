import { and, eq, inArray, isNotNull, lt, max } from "drizzle-orm";
import { prompts } from "../agents/prompts.ts";
import type { ScreenWeights } from "../contracts/fund-thesis-schema.ts";
import {
  macroBriefSchema,
  type MacroBrief,
} from "../contracts/macro-brief-schema.ts";
import { cashEntries, dailyBars, fills } from "../fund-schema.ts";
import { BENCHMARK, FX_SYMBOL } from "../guardrails.ts";
import { addDays } from "../ledger/add-days.ts";
import { dividendEntries } from "../ledger/dividend-entries.ts";
import { optionalInstrumentOf } from "../ledger/instrument-of.ts";
import { getBars } from "../market/get-bars.ts";
import { getDividends } from "../market/get-dividends.ts";
import { getFundamentals } from "../market/get-fundamentals.ts";
import { getFxSeries } from "../market/get-fx-series.ts";
import { getInstruments } from "../market/get-instruments.ts";
import {
  screenUniverse,
  type ScreenResult,
} from "../screener/screen-universe.ts";
import type { Bar } from "../types.ts";
import { callSeat, WEB_SEARCHES } from "./call-seat.ts";
import { HISTORY_SESSIONS, loadFundState } from "./load-fund-state.ts";
import { memos, sayIn } from "./memos.ts";
import { roundTo } from "./round-to.ts";
import { stepOutputs } from "./step-outputs.ts";
import type { StepContext, StepOutcome } from "./types.ts";

const EQUAL_WEIGHTS: ScreenWeights = {
  value: 1,
  quality: 1,
  momentum: 1,
  growth: 1,
  lowVolatility: 1,
};
const MAX_NOMINATIONS = 3;

export interface DataOutput {
  universe: string[] | null;
  refresh: {
    barsAdded: number;
    dividendsAdded: number;
    fundamentalsRefreshed: number;
    failures: number;
  } | null;
  refreshError: string | null;
  dividendsPosted: { symbol: string | null; date: string; amountGbp: number }[];
  latestClose: string | null;
}

export interface ScreenOutput {
  weights: ScreenWeights;
  result: ScreenResult;
}

/** Refreshes market data and posts the dividends that are due. */
async function data(ctx: StepContext): Promise<StepOutcome> {
  const { db, refreshMarket } = ctx.deps;
  const { asOf } = ctx.run;
  const say = sayIn(ctx.deps.language);
  const universe = ctx.deps.universe ? [...ctx.deps.universe] : null;
  const fillRows = await db
    .select()
    .from(fills)
    .where(lt(fills.filledOn, asOf));
  const heldSymbols = [...new Set(fillRows.map((f) => f.symbol))];

  let refresh: DataOutput["refresh"] = null;
  let refreshError: string | null = null;
  if (refreshMarket) {
    try {
      const summary = await refreshMarket(
        universe ? [...new Set([...universe, ...heldSymbols])] : undefined,
      );
      refresh = {
        barsAdded: summary.barsAdded,
        dividendsAdded: summary.dividendsAdded,
        fundamentalsRefreshed: summary.fundamentalsRefreshed,
        failures: summary.failures.length,
      };
    } catch (error) {
      refreshError = error instanceof Error ? error.message : String(error);
    }
  }

  let posted: DataOutput["dividendsPosted"] = [];
  if (fillRows.length > 0) {
    const from = fillRows.reduce(
      (min, f) => (f.filledOn < min ? f.filledOn : min),
      asOf,
    );
    const dividends = await getDividends(db, heldSymbols, {
      from,
      before: addDays(asOf, 1),
    });
    if (dividends.length > 0) {
      const paid = await db
        .select({ key: cashEntries.dedupeKey })
        .from(cashEntries)
        .where(
          and(
            eq(cashEntries.kind, "dividend"),
            isNotNull(cashEntries.dedupeKey),
          ),
        );
      const entries = dividendEntries({
        fills: fillRows,
        dividends,
        instruments: await getInstruments(db),
        fx: await getFxSeries(db, { before: addDays(asOf, 1), sessions: 2000 }),
        paidKeys: new Set(paid.map((p) => p.key ?? "")),
        asOf,
      });
      if (entries.length > 0) {
        posted = await db
          .insert(cashEntries)
          .values(entries)
          .onConflictDoNothing()
          .returning({
            symbol: cashEntries.symbol,
            date: cashEntries.date,
            amountGbp: cashEntries.amountGbp,
          });
      }
    }
  }

  const latest = (
    await db
      .select({ date: max(dailyBars.date) })
      .from(dailyBars)
      .where(
        and(
          inArray(dailyBars.symbol, [
            BENCHMARK.symbols.LSE,
            BENCHMARK.symbols.US,
          ]),
          lt(dailyBars.date, asOf),
        ),
      )
  ).at(0);
  const output: DataOutput = {
    universe,
    refresh,
    refreshError,
    dividendsPosted: posted,
    latestClose: latest?.date ?? null,
  };
  const lines = [
    refresh
      ? say(
          `Market data refreshed: ${String(refresh.barsAdded)} bars, ${String(refresh.dividendsAdded)} dividends and ${String(refresh.fundamentalsRefreshed)} fundamentals added; ${String(refresh.failures)} symbols failed.`,
          `行情已更新：新增 ${String(refresh.barsAdded)} 根K线、${String(refresh.dividendsAdded)} 条分红、${String(refresh.fundamentalsRefreshed)} 份基本面；${String(refresh.failures)} 只股票更新失败。`,
        )
      : refreshError
        ? say(
            `The market data refresh failed (${refreshError}); the meeting uses the stored data.`,
            `行情更新失败（${refreshError}），会议使用已存数据。`,
          )
        : say(
            "The meeting uses the stored market data.",
            "会议使用已存行情数据。",
          ),
    say(
      `Latest close: ${output.latestClose ?? "none"}.`,
      `最新收盘日：${output.latestClose ?? "无"}。`,
    ),
    ...posted.map((d) =>
      say(
        `Dividend posted: ${d.symbol ?? ""} £${d.amountGbp.toFixed(2)} (${d.date}).`,
        `已入账分红：${d.symbol ?? ""} £${d.amountGbp.toFixed(2)}（${d.date}）。`,
      ),
    ),
    universe
      ? say(
          `Universe limited to ${universe.join(", ")}.`,
          `股票池限定为 ${universe.join("、")}。`,
        )
      : "",
  ].filter(Boolean);
  return {
    status: "done",
    input: { asOf, universe, refresh: refreshMarket !== null },
    output,
    memo: lines.join("\n\n"),
  };
}

/** Runs the rule screen with the weights of the fund thesis, or equal ones. */
async function screen(ctx: StepContext): Promise<StepOutcome> {
  const { db } = ctx.deps;
  const { asOf } = ctx.run;
  const say = sayIn(ctx.deps.language);
  const dataOutput = ctx.output("data", stepOutputs.data);
  const universe = dataOutput?.universe ?? null;
  const state = await loadFundState(db, asOf);
  const stocks = (await getInstruments(db, { kind: "stock" })).filter(
    (i) => universe === null || universe.includes(i.symbol),
  );
  const symbols = stocks.map((i) => i.symbol);
  const weights = state.fundThesis?.body.screenWeights ?? EQUAL_WEIGHTS;
  const result = screenUniverse({
    instruments: stocks,
    bars: await getBars(db, symbols, {
      before: asOf,
      sessions: HISTORY_SESSIONS,
    }),
    fundamentals: await getFundamentals(db, symbols, { asOf }),
    fx: state.fx,
    weights,
    held: new Set(state.portfolio.positions.map((p) => p.symbol)),
    asOf,
  });
  const output: ScreenOutput = { weights, result };
  const memo = [
    say(
      `Screened ${String(result.rows.length)} stocks; ${String(result.excluded.length)} excluded by the rules. Weights: ${Object.entries(
        weights,
      )
        .map(([k, v]) => `${k} ${String(v)}`)
        .join(", ")}${state.fundThesis ? "" : " (equal: no fund thesis yet)"}.`,
      `筛选 ${String(result.rows.length)} 只股票，${String(result.excluded.length)} 只被规则排除。权重：${Object.entries(
        weights,
      )
        .map(([k, v]) => `${k} ${String(v)}`)
        .join("，")}${state.fundThesis ? "" : "（尚无基金投资逻辑，等权）"}。`,
    ),
    `**${say("Shortlist", "候选名单")}**\n\n${result.shortlist
      .map(
        (r) =>
          `- ${r.symbol} (${r.sector}) ${say("composite", "综合分")} ${String(roundTo(r.composite, 1))}`,
      )
      .join("\n")}`,
  ].join("\n\n");
  return {
    status: "done",
    input: { asOf, universe, weights, symbols: symbols.length },
    output,
    memo,
  };
}

function marketLine(bars: readonly Bar[]) {
  const last = bars.at(-1);
  const back = (n: number) => bars.at(-1 - n)?.adjClose;
  const ret = (n: number) => {
    const start = back(n);
    return last && start ? roundTo((last.adjClose / start - 1) * 100, 1) : null;
  };
  return last
    ? {
        lastClose: roundTo(last.close, 4),
        date: last.date,
        return1dPct: ret(1),
        return1wPct: ret(5),
        return1mPct: ret(21),
        return3mPct: ret(63),
      }
    : null;
}

/** The strategist's brief, with web search. Nominations outside the universe are dropped. */
async function macro(ctx: StepContext): Promise<StepOutcome> {
  const { db, language } = ctx.deps;
  const { asOf } = ctx.run;
  const say = sayIn(language);
  const screenOutput = ctx.output("screen", stepOutputs.screen);
  if (!screenOutput) throw new Error("The screen has no output.");
  const state = await loadFundState(db, asOf);
  const instrumentFor = optionalInstrumentOf(state.instruments);
  const universe = screenOutput.result.rows.map((r) => r.symbol);
  const universeSet = new Set(universe);
  const benchmarks = await getBars(
    db,
    [BENCHMARK.symbols.LSE, BENCHMARK.symbols.US, FX_SYMBOL],
    { before: asOf, sessions: 70 },
  );

  const sections = [
    {
      title: "Meeting",
      body: {
        asOf,
        note: `The session of ${asOf} has not opened. The newest data is from the session before it.`,
      },
    },
    {
      title: "Markets (index levels and GBPUSD, from stored closes)",
      body: {
        ftse100: marketLine(benchmarks.get(BENCHMARK.symbols.LSE) ?? []),
        sp500: marketLine(benchmarks.get(BENCHMARK.symbols.US) ?? []),
        gbpUsd: marketLine(benchmarks.get(FX_SYMBOL) ?? []),
      },
    },
    {
      title: "The fund",
      body: {
        holdings: state.portfolio.positions.map((p) => p.symbol),
        openOrders: state.openOrders.map((o) => `${o.side} ${o.symbol}`),
        cashWeightPct: roundTo(state.portfolio.cashWeightPct, 1),
        shortlistOfTheRuleScreen: screenOutput.result.shortlist.map(
          (r) => r.symbol,
        ),
      },
    },
    {
      title: "Universe (symbol, name, sector) — nominate only from this list",
      body: universe
        .map((symbol) => {
          const i = instrumentFor(symbol);
          return `${symbol} | ${i?.name ?? ""} | ${i?.sector ?? ""}`;
        })
        .join("\n"),
    },
  ];
  const reply = await callSeat(ctx, {
    role: "strategist",
    instructions: prompts.strategist({ asOf, language }),
    schema: macroBriefSchema,
    sections,
    webSearch: WEB_SEARCHES.strategist,
  });
  const nominations: MacroBrief["nominations"] = [];
  const dropped: string[] = [];
  for (const n of reply.output.nominations) {
    const symbol = n.symbol.trim().toUpperCase();
    if (
      universeSet.has(symbol) &&
      nominations.length < MAX_NOMINATIONS &&
      !nominations.some((k) => k.symbol === symbol)
    ) {
      nominations.push({ symbol, reason: n.reason });
    } else {
      dropped.push(n.symbol);
    }
  }
  const brief: MacroBrief = {
    ...reply.output,
    themes: reply.output.themes.map((t) => ({
      ...t,
      symbols: t.symbols
        .map((s) => s.trim().toUpperCase())
        .filter((s) => instrumentFor(s)),
    })),
    nominations,
  };
  return {
    status: "done",
    input: reply.input,
    output: brief,
    memo: memos.macro(say, brief, dropped),
    model: reply.model,
    usage: reply.usage,
  };
}

/** The first three steps of a meeting. */
export const commonSteps = { data, screen, macro };
