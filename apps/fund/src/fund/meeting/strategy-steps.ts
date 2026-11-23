import { prompts } from "../agents/prompts.ts";
import { GUARDRAILS } from "../guardrails.ts";
import { formatDay } from "../ledger/add-days.ts";
import { derivePortfolio } from "../ledger/derive-portfolio.ts";
import { valuePortfolio } from "../ledger/value-portfolio.ts";
import { clampLimits } from "../orders/clamp-limits.ts";
import { callSeat } from "./call-seat.ts";
import { cutText } from "./cut-text.ts";
import { journalReads } from "./journal-reads.ts";
import { loadFundState, type FundState } from "./load-fund-state.ts";
import { measureFund } from "./measure-fund.ts";
import { memos, sayIn } from "./memos.ts";
import { packParts } from "./pack-parts.ts";
import {
  stepOutputs,
  type StrategyPolicyOutput,
  type StrategyThesisOutput,
} from "./step-outputs.ts";
import type { PackSection, StepContext, StepOutcome } from "./types.ts";

const JOURNAL_SINCE_LIMIT = 60;
const RATIONALE_CHARS = 600;

async function fundSections(
  ctx: StepContext,
  state: FundState,
): Promise<PackSection[]> {
  const screen = ctx.output("screen", stepOutputs.screen);
  const firstSession = state.cashEntries.every((e) => e.kind !== "deposit");
  const portfolio = firstSession
    ? valuePortfolio(
        derivePortfolio({
          fills: [],
          cashEntries: [
            {
              date: state.asOf,
              kind: "deposit",
              amountGbp: GUARDRAILS.startingCashGbp,
            },
          ],
          asOf: state.asOf,
        }),
        state,
      )
    : state.portfolio;
  return [
    {
      title: "State of the fund",
      body: {
        note: firstSession
          ? `This is the first strategy session. The fund is all cash. The portfolio below includes the starting deposit of £${GUARDRAILS.startingCashGbp.toLocaleString("en-GB")}, which is booked when this session ends.`
          : null,
        portfolio: packParts.portfolio(state, portfolio),
        orders: packParts.orders(state),
        exposure: await measureFund(
          ctx.deps.db,
          state,
          portfolio,
          screen?.result.rows ?? [],
          state.riskPolicy?.policy ?? null,
        ),
      },
    },
    { title: "Owner's guardrails", body: packParts.guardrails() },
  ];
}

async function journalSince(ctx: StepContext, state: FundState) {
  const entries = await journalReads.newest(
    ctx.deps.db,
    state.asOf,
    JOURNAL_SINCE_LIMIT,
    { since: state.fundThesis?.createdAt },
  );
  return entries.map((e) => ({
    date: e.date,
    symbol: e.symbol,
    kind: e.kind,
    summary: e.summary,
    rationale: cutText(e.rationale, RATIONALE_CHARS),
  }));
}

async function pmStrategy(ctx: StepContext): Promise<StepOutcome> {
  const { db, language } = ctx.deps;
  const { asOf } = ctx.run;
  const state = await loadFundState(db, asOf);
  const screen = ctx.output("screen", stepOutputs.screen);
  const sections: PackSection[] = [
    { title: "Meeting", body: { kind: "strategy", asOf } },
    {
      title: "Strategist's brief",
      body: packParts.brief(ctx.output("macro", stepOutputs.macro)),
    },
    {
      title: "Rule screen of the universe (with today's weights)",
      body: screen
        ? packParts.screen(
            screen.result,
            state.instruments,
            state.portfolio.positions.map((p) => p.symbol),
            screen.weights,
          )
        : "The screen is missing.",
    },
    ...(await fundSections(ctx, state)),
    {
      title: "Earlier fund thesis",
      body: state.fundThesis
        ? {
            version: state.fundThesis.version,
            writtenOn: formatDay(state.fundThesis.createdAt.getTime()),
            ...state.fundThesis.body,
          }
        : "None: this is the first version.",
    },
    { title: "Current risk policy", body: packParts.policy(state.riskPolicy) },
    {
      title: "Journal since the earlier thesis",
      body: await journalSince(ctx, state),
    },
  ];
  const reply = await callSeat(ctx, {
    role: "pm",
    instructions: prompts.pmStrategy({ asOf, language }),
    schema: stepOutputs.thesis,
    sections,
    webSearch: null,
  });
  const output: StrategyThesisOutput = {
    ...reply.output,
    changeNote: state.fundThesis ? reply.output.changeNote : null,
  };
  const { changeNote: note, ...thesis } = output;
  return {
    status: "done",
    input: reply.input,
    output,
    memo: memos.fundThesis(sayIn(language), thesis, note),
    model: reply.model,
    usage: reply.usage,
  };
}

async function riskStrategy(ctx: StepContext): Promise<StepOutcome> {
  const { db, language } = ctx.deps;
  const { asOf } = ctx.run;
  const say = sayIn(language);
  const state = await loadFundState(db, asOf);
  const thesis = ctx.output("pm_strategy", stepOutputs.thesis);
  const brief = ctx.output("macro", stepOutputs.macro);
  const sections: PackSection[] = [
    { title: "Meeting", body: { kind: "strategy", asOf } },
    { title: "The fund thesis the PM wrote today", body: thesis },
    { title: "Earlier risk policy", body: packParts.policy(state.riskPolicy) },
    ...(await fundSections(ctx, state)),
    {
      title: "Strategist's brief (summary)",
      body: brief
        ? { summary: brief.summary, regime: brief.regime, risks: brief.risks }
        : "Missing.",
    },
  ];
  const reply = await callSeat(ctx, {
    role: "risk",
    instructions: prompts.riskStrategy({ asOf, language }),
    schema: stepOutputs.policy,
    sections,
    webSearch: null,
  });
  const limits = clampLimits(reply.output.limits);
  const clamped = (
    [
      "maxPositionWeightPct",
      "maxSectorWeightPct",
      "minCashWeightPct",
      "maxUsdWeightPct",
      "maxPositions",
    ] as const
  ).filter((k) => limits[k] !== reply.output.limits[k]);
  const output: StrategyPolicyOutput = {
    ...reply.output,
    limits,
    changeNote: state.riskPolicy ? reply.output.changeNote : null,
  };
  const { changeNote: note, ...policy } = output;
  return {
    status: "done",
    input: reply.input,
    output,
    memo: [
      memos.riskPolicy(say, policy, note),
      clamped.length > 0
        ? say(
            `Code clamped ${clamped.join(", ")} to the owner's guardrails.`,
            `代码已将 ${clamped.join("、")} 限制在所有者的硬性规则内。`,
          )
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    model: reply.model,
    usage: reply.usage,
  };
}

/** The two seats of a strategy session. */
export const strategySteps = { pmStrategy, riskStrategy };
