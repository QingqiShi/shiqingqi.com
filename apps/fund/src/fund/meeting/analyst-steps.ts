import { prompts } from "../agents/prompts.ts";
import type {
  AnalystAnswer,
  AnalystNote,
} from "../contracts/analyst-note-schema.ts";
import { addDays, formatDay } from "../ledger/add-days.ts";
import { getBars } from "../market/get-bars.ts";
import { getDividends } from "../market/get-dividends.ts";
import { getFundamentals } from "../market/get-fundamentals.ts";
import type { RunStep } from "../types.ts";
import { callSeat, WEB_SEARCHES } from "./call-seat.ts";
import { dataNotes } from "./data-notes.ts";
import { journalReads } from "./journal-reads.ts";
import { loadFundState } from "./load-fund-state.ts";
import { memos, sayIn } from "./memos.ts";
import { packParts } from "./pack-parts.ts";
import { pricePack } from "./price-pack.ts";
import { quotePrice, quoteUnit } from "./quote-price.ts";
import { stepOutputs } from "./step-outputs.ts";
import { stepPlan, type PlannedStep } from "./step-plan.ts";
import { stepReads } from "./step-reads.ts";
import type {
  MeetingDeps,
  PackSection,
  StepContext,
  StepOutcome,
} from "./types.ts";

/** Two years of sessions for an analyst's price history. */
const ANALYST_SESSIONS = 520;
const MAX_FOLLOW_UPS = 6;
const DIVIDEND_DAYS = 730;
const ANALYST_JOURNAL = 15;

/** The analysts of the day: holdings, open orders, the shortlist, the nominations. */
async function extraSteps(
  deps: MeetingDeps,
  run: StepContext["run"],
  steps: readonly RunStep[],
): Promise<PlannedStep[]> {
  const settled = (key: string) => {
    const status = stepReads.stepOf(steps, key)?.status;
    return status === "done" || status === "skipped";
  };
  const extra: PlannedStep[] = [];
  if (settled("macro") && !steps.some((s) => s.key.startsWith("analyst:"))) {
    const state = await loadFundState(deps.db, run.asOf);
    const screen = stepReads.outputOf(steps, "screen", stepOutputs.screen);
    const brief = stepReads.outputOf(steps, "macro", stepOutputs.macro);
    const symbols = [
      ...new Set([
        ...state.portfolio.positions.map((p) => p.symbol),
        ...state.openOrders.map((o) => o.symbol),
        ...(screen?.result.shortlist ?? []).map((r) => r.symbol),
        ...(brief?.nominations ?? []).map((n) => n.symbol),
      ]),
    ];
    extra.push(...symbols.map((s, i) => stepPlan.analystStep(s, i)));
  }
  if (
    settled("pm_draft") &&
    !steps.some((s) => s.key.startsWith("followup:"))
  ) {
    const draft = stepReads.outputOf(steps, "pm_draft", stepOutputs.pm);
    const { found } = stepReads.analystNotes(steps);
    const symbols = [
      ...new Set(
        (draft?.questions ?? [])
          .map((q) => q.symbol)
          .filter((s) => found.has(s)),
      ),
    ].slice(0, MAX_FOLLOW_UPS);
    extra.push(...symbols.map((s, i) => stepPlan.followUpStep(s, i)));
  }
  return extra;
}

async function analyst(ctx: StepContext): Promise<StepOutcome> {
  const { db, language } = ctx.deps;
  const { asOf } = ctx.run;
  const symbol = stepPlan.symbolOf(ctx.key);
  const state = await loadFundState(db, asOf);
  const instrument = state.instrumentFor(symbol);
  const bars =
    (
      await getBars(db, [symbol], { before: asOf, sessions: ANALYST_SESSIONS })
    ).get(symbol) ?? [];
  const fundamentals =
    (await getFundamentals(db, [symbol], { asOf })).get(symbol) ?? null;
  const paid = await getDividends(db, [symbol], {
    from: addDays(asOf, -DIVIDEND_DAYS),
    before: asOf,
  });
  const screen = ctx.output("screen", stepOutputs.screen);
  const brief = ctx.output("macro", stepOutputs.macro);
  const rows = screen?.result.rows ?? [];
  const rank = rows.findIndex((r) => r.symbol === symbol);
  const position = state.portfolio.positions.find((p) => p.symbol === symbol);
  const thesis = state.positionTheses.get(symbol);
  const screenBody = screen
    ? packParts.screen(
        screen.result,
        state.instruments,
        [symbol],
        screen.weights,
      )
    : null;
  const exclusion = screen?.result.excluded.find((e) => e.symbol === symbol);
  const journal =
    (
      await journalReads.newestOfSymbols(db, asOf, [symbol], ANALYST_JOURNAL)
    ).get(symbol) ?? [];

  const sections: PackSection[] = [
    {
      title: "Stock",
      body: {
        symbol,
        name: instrument.name,
        exchange: instrument.exchange,
        index: instrument.index,
        sector: instrument.sector,
        industry: instrument.industry,
        priceUnit: quoteUnit(instrument),
        note: "Every price in this pack is in the price unit. Give entryLow and entryHigh in it too.",
        data: dataNotes.record,
      },
    },
    { title: "Price history", body: pricePack(bars, instrument) },
    {
      title: "Earnings and valuation",
      body: fundamentals
        ? {
            ...fundamentals,
            analystTargetMean: quotePrice(
              fundamentals.analystTargetMean,
              instrument,
            ),
            note: `EPS, revenue, net income and free cash flow are in ${fundamentals.financialCurrency ?? "the financial currency"}, major units. Ratios are fractions (0.12 = 12%). analystTargetMean is in the price unit. A snapshot fetched today can be newer than the meeting date. A null nextEarningsDate means the data source has no date, as for most London stocks: find the date if you can, and say in your note what is known.`,
          }
        : "No fundamentals are stored for this stock.",
    },
    {
      title: "Dividends",
      body: {
        note: "Ex-dates in the last two years, before this meeting; amounts per share in the price unit. exDividendDate above can name the next one.",
        paid: paid.map((d) => ({
          exDate: d.exDate,
          amount: quotePrice(d.amount, instrument),
        })),
      },
    },
    {
      title: "Rule screen",
      body:
        rank >= 0 && screenBody
          ? {
              rank: rank + 1,
              of: rows.length,
              weights: screen?.weights,
              row: [
                ...screenBody.shortlist,
                ...screenBody.top,
                ...screenBody.onTodaysTable,
              ].find((r) => r.symbol === symbol),
              universeMedians: screenBody.universeMedians,
            }
          : `Not in today's screen${exclusion ? `: excluded by the ${exclusion.reason} rule (measured ${String(exclusion.measured)}, required ${String(exclusion.required)})` : ""}.`,
    },
    {
      title: "The fund and this stock",
      body: {
        held: position
          ? packParts
              .portfolio(state, state.portfolio)
              .positions.find((p) => p.symbol === symbol)
          : `The fund does not own ${symbol}.`,
        thesis: thesis
          ? {
              version: thesis.version,
              since: formatDay(thesis.createdAt.getTime()),
              ...thesis.body,
            }
          : null,
        openOrders: packParts
          .orders(state)
          .open.filter((o) => o.symbol === symbol),
        journal: journal.map((e) => ({
          date: e.date,
          kind: e.kind,
          summary: e.summary,
          rationale: e.rationale,
        })),
      },
    },
    { title: "Strategist's brief", body: packParts.brief(brief) },
  ];
  const reply = await callSeat(ctx, {
    role: "analyst",
    instructions: prompts.analyst({ asOf, language }),
    schema: stepOutputs.analyst,
    sections,
    webSearch: WEB_SEARCHES.analyst,
  });
  const note: AnalystNote = {
    ...reply.output,
    symbol,
    thesisCheck: position ? reply.output.thesisCheck : "not_held",
  };
  return {
    status: "done",
    input: reply.input,
    output: note,
    memo: memos.analyst(sayIn(language), note, instrument),
    model: reply.model,
    usage: reply.usage,
  };
}

async function followUp(ctx: StepContext): Promise<StepOutcome> {
  const { language } = ctx.deps;
  const symbol = stepPlan.symbolOf(ctx.key);
  const draft = ctx.output("pm_draft", stepOutputs.pm);
  const analystStep = stepReads.stepOf(ctx.steps, `analyst:${symbol}`);
  const question = (draft?.questions ?? [])
    .filter((q) => q.symbol === symbol)
    .map((q) => q.question)
    .join("\n\n");
  const sections: PackSection[] = [
    { title: "Your note", body: analystStep?.output ?? null },
    {
      title: "The data you were given",
      body: stepOutputs.pack
        .parse(analystStep?.input ?? [])
        .filter((s) => s.title !== "Strategist's brief"),
    },
    { title: "The PM's question", body: question },
  ];
  const reply = await callSeat(ctx, {
    role: "analyst",
    instructions: prompts.analystFollowUp({ asOf: ctx.run.asOf, language }),
    schema: stepOutputs.answer,
    sections,
    webSearch: null,
  });
  const answer: AnalystAnswer = { ...reply.output, symbol };
  return {
    status: "done",
    input: reply.input,
    output: answer,
    memo: memos.answer(sayIn(language), question, answer),
    model: reply.model,
    usage: reply.usage,
  };
}

/** The analysts of the daily meeting: who sits, their notes, their answers. */
export const analystSteps = { extraSteps, analyst, followUp };
