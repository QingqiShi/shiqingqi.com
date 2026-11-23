import { prompts } from "../agents/prompts.ts";
import {
  pmDecisionSchema,
  type PmAction,
  type PmDecision,
} from "../contracts/pm-decision-schema.ts";
import {
  riskReviewSchema,
  riskSignoffSchema,
  type RiskReview,
  type RiskSignoff,
} from "../contracts/risk-review-schema.ts";
import { optionalInstrumentOf } from "../ledger/instrument-of.ts";
import { planOrders } from "../orders/plan-orders.ts";
import { proFormaPortfolio } from "../orders/pro-forma-portfolio.ts";
import type { OrderPlan, PlannedOrder } from "../orders/types.ts";
import { callSeat } from "./call-seat.ts";
import type { ScreenOutput } from "./common-steps.ts";
import { dataNotes } from "./data-notes.ts";
import { journalReads } from "./journal-reads.ts";
import { loadFundState, type FundState } from "./load-fund-state.ts";
import { measureFund } from "./measure-fund.ts";
import { memos, sayIn } from "./memos.ts";
import { packParts } from "./pack-parts.ts";
import { stepOutputs } from "./step-outputs.ts";
import { stepPlan } from "./step-plan.ts";
import { stepReads } from "./step-reads.ts";
import type { PackSection, StepContext, StepOutcome } from "./types.ts";

type ExposureBody = Awaited<ReturnType<typeof measureFund>>;

export interface ChecksOutput {
  plan: OrderPlan;
  proForma: ExposureBody;
}

export interface FinalChecksOutput extends ChecksOutput {
  /** The PM's final actions, with a hold added for each holding it left out. */
  actions: PmAction[];
  addedHolds: string[];
}

const normalise = (symbol: string) => symbol.trim().toUpperCase();

function cleanDecision(decision: PmDecision): PmDecision {
  return {
    ...decision,
    actions: decision.actions.map((a) => ({
      ...a,
      symbol: normalise(a.symbol),
    })),
    questions: decision.questions.map((q) => ({
      ...q,
      symbol: normalise(q.symbol),
    })),
  };
}

/** Sections 1 to 10 of a PM pack, in the order the PM prompt names them. */
async function pmSections(
  ctx: StepContext,
  state: FundState,
): Promise<PackSection[]> {
  const screen = ctx.output("screen", stepOutputs.screen);
  const symbols = stepReads.tableSymbols(ctx.steps);
  const { found, failures } = stepReads.analystNotes(ctx.steps);
  const journal = await journalReads.forPm(ctx.deps.db, state.asOf, symbols);
  const exposure = await measureFund(
    ctx.deps.db,
    state,
    state.portfolio,
    screen?.result.rows ?? [],
    state.riskPolicy?.policy ?? null,
  );
  return [
    {
      title: "Meeting",
      body: {
        asOf: state.asOf,
        note: `Decisions are for the session of ${state.asOf}. Prices are quote units: pence (GBX) for London, USD for US.`,
        data: [dataNotes.record, dataNotes.earningsDate, dataNotes.noLookups],
      },
    },
    {
      title: "Fund thesis and plan",
      body: state.fundThesis
        ? { version: state.fundThesis.version, ...state.fundThesis.body }
        : "There is no fund thesis.",
    },
    {
      title: "Risk policy",
      body: {
        policy: packParts.policy(state.riskPolicy),
        guardrails: packParts.guardrails(),
      },
    },
    {
      title: "Portfolio (each lot with its unlock date)",
      body: packParts.portfolio(state, state.portfolio),
    },
    {
      title: "Orders: open and recently ended, with your plan for each",
      body: packParts.orders(state),
    },
    { title: "Trade journal", body: packParts.journal(journal) },
    { title: "Measured risk exposure against the policy", body: exposure },
    {
      title: "Strategist's brief",
      body: packParts.brief(ctx.output("macro", stepOutputs.macro)),
    },
    {
      title: "Rule screen",
      body: screen
        ? packParts.screen(
            screen.result,
            state.instruments,
            symbols,
            screen.weights,
          )
        : "The screen is missing.",
    },
    {
      title: "Analysts' notes",
      body: packParts.notes(symbols, found, failures),
    },
  ];
}

async function pmDraft(ctx: StepContext): Promise<StepOutcome> {
  const { db, language } = ctx.deps;
  const state = await loadFundState(db, ctx.run.asOf);
  const reply = await callSeat(ctx, {
    role: "pm",
    instructions: prompts.pmDraft({ asOf: ctx.run.asOf, language }),
    schema: pmDecisionSchema,
    sections: await pmSections(ctx, state),
    webSearch: null,
  });
  const decision = cleanDecision(reply.output);
  return {
    status: "done",
    input: reply.input,
    output: decision,
    memo: memos.pmDecision(sayIn(language), decision),
    model: reply.model,
    usage: reply.usage,
  };
}

/** `planOrders` for a set of actions. `state` must hold the bars of their symbols. */
function check(
  ctx: StepContext,
  state: FundState,
  actions: readonly PmAction[],
) {
  if (!state.riskPolicy) throw new Error("There is no risk policy.");
  const plan = planOrders({
    actions,
    portfolio: state.portfolio,
    openOrders: state.openOrders,
    instruments: state.instruments,
    bars: state.bars,
    gbpUsd: state.gbpUsd,
    limits: state.riskPolicy.policy.limits,
    symbolsWithThesis: new Set(state.positionTheses.keys()),
    asOf: ctx.run.asOf,
  });
  const screen = ctx.output("screen", stepOutputs.screen);
  return { plan, screenRows: screen?.result.rows ?? [] };
}

async function proFormaOf(
  ctx: StepContext,
  state: FundState,
  orders: readonly PlannedOrder[],
  screenRows: ScreenOutput["result"]["rows"],
) {
  const portfolio = proFormaPortfolio(state.portfolio, orders, {
    instruments: state.instruments,
    gbpUsd: state.gbpUsd,
  });
  return measureFund(
    ctx.deps.db,
    state,
    portfolio,
    screenRows,
    state.riskPolicy?.policy ?? null,
  );
}

function exposureLines(
  say: ReturnType<typeof sayIn>,
  proForma: ExposureBody,
): string {
  const m = proForma.metrics;
  return `**${say("If every order fills", "若全部成交")}**\n\n${say("cash", "现金")} ${String(m.cash_weight_pct)}%, ${say("largest position", "最大持仓")} ${String(m.largest_position_pct)}%, ${say("largest sector", "最大行业")} ${String(m.largest_sector_pct)}%, USD ${String(m.usd_weight_pct)}%, ${say("positions", "持仓数")} ${String(m.position_count)}, beta ${String(m.equity_beta)}`;
}

async function checksDraft(ctx: StepContext): Promise<StepOutcome> {
  const draft = ctx.output("pm_draft", stepOutputs.pm);
  if (!draft) throw new Error("The draft is missing.");
  const state = await loadFundState(ctx.deps.db, ctx.run.asOf, {
    symbols: draft.actions.map((a) => a.symbol),
  });
  const { plan, screenRows } = check(ctx, state, draft.actions);
  const proForma = await proFormaOf(ctx, state, plan.planned, screenRows);
  const output: ChecksOutput = { plan, proForma };
  const say = sayIn(ctx.deps.language);
  return {
    status: "done",
    input: { actions: draft.actions.length },
    output,
    memo: memos.checks(say, plan, optionalInstrumentOf(state.instruments), [
      exposureLines(say, proForma),
    ]),
  };
}

function draftSections(ctx: StepContext, state: FundState): PackSection[] {
  const draft = ctx.output("pm_draft", stepOutputs.pm);
  const checks = ctx.output("checks_draft", stepOutputs.checks);
  return [
    { title: "The PM's draft", body: draft },
    {
      title: "Orders that code derived from the draft",
      body: checks
        ? packParts.plannedOrders(checks.plan.planned, state.instruments)
        : [],
    },
    {
      title: "Breaches of hard rules that code found",
      body: checks
        ? {
            violations: checks.plan.violations,
            adjustments: checks.plan.adjustments,
          }
        : [],
    },
  ];
}

async function riskReview(ctx: StepContext): Promise<StepOutcome> {
  const { db, language } = ctx.deps;
  const state = await loadFundState(db, ctx.run.asOf);
  const checks = ctx.output("checks_draft", stepOutputs.checks);
  const screen = ctx.output("screen", stepOutputs.screen);
  const symbols = stepReads.tableSymbols(ctx.steps);
  const { found, failures } = stepReads.analystNotes(ctx.steps);
  const sections: PackSection[] = [
    {
      title: "Meeting",
      body: {
        asOf: state.asOf,
        data: [dataNotes.record, dataNotes.earningsDate, dataNotes.noLookups],
      },
    },
    {
      title: "Risk policy (yours)",
      body: {
        policy: packParts.policy(state.riskPolicy),
        guardrails: packParts.guardrails(),
      },
    },
    {
      title: "Fund thesis",
      body: state.fundThesis
        ? { version: state.fundThesis.version, ...state.fundThesis.body }
        : null,
    },
    {
      title: "Portfolio today",
      body: packParts.portfolio(state, state.portfolio),
    },
    {
      title: "Measured exposure today",
      body: await measureFund(
        db,
        state,
        state.portfolio,
        screen?.result.rows ?? [],
        state.riskPolicy?.policy ?? null,
      ),
    },
    { title: "Open orders", body: packParts.orders(state).open },
    ...draftSections(ctx, state),
    {
      title: "Exposure if every derived order fills",
      body: checks?.proForma ?? null,
    },
    {
      title: "Analysts' notes",
      body: packParts.notes(symbols, found, failures),
    },
  ];
  const reply = await callSeat(ctx, {
    role: "risk",
    instructions: prompts.riskReview({ asOf: ctx.run.asOf, language }),
    schema: riskReviewSchema,
    sections,
    webSearch: null,
  });
  const review: RiskReview = {
    ...reply.output,
    verdicts: reply.output.verdicts.map((v) => ({
      ...v,
      symbol: normalise(v.symbol),
    })),
  };
  return {
    status: "done",
    input: reply.input,
    output: review,
    memo: memos.riskReview(sayIn(language), review),
    model: reply.model,
    usage: reply.usage,
  };
}

async function pmFinal(ctx: StepContext): Promise<StepOutcome> {
  const { db, language } = ctx.deps;
  const state = await loadFundState(db, ctx.run.asOf);
  const answers = ctx.steps
    .filter((s) => s.key.startsWith("followup:"))
    .map((s) =>
      s.status === "done"
        ? s.output
        : {
            symbol: stepPlan.symbolOf(s.key),
            missing: `No answer: ${s.error ?? s.status}.`,
          },
    );
  const sections: PackSection[] = [
    ...(await pmSections(ctx, state)),
    ...draftSections(ctx, state).map((s) =>
      s.title === "The PM's draft" ? { ...s, title: "Your draft" } : s,
    ),
    {
      title: "The risk officer's review",
      body: ctx.output("risk_review", stepOutputs.review),
    },
    { title: "Analysts' answers to your questions", body: answers },
  ];
  const reply = await callSeat(ctx, {
    role: "pm",
    instructions: prompts.pmFinal({ asOf: ctx.run.asOf, language }),
    schema: pmDecisionSchema,
    sections,
    webSearch: null,
  });
  const decision = cleanDecision(reply.output);
  return {
    status: "done",
    input: reply.input,
    output: decision,
    memo: memos.pmDecision(sayIn(language), decision),
    model: reply.model,
    usage: reply.usage,
  };
}

function holdFor(symbol: string): PmAction {
  return {
    symbol,
    action: "hold",
    targetWeightPct: null,
    limitPrice: null,
    validSessions: null,
    onExpiry: null,
    repriceLimit: null,
    unfilledPlan: null,
    rationale: "",
    thesis: null,
    thesisChangeNote: null,
  };
}

async function checksFinal(ctx: StepContext): Promise<StepOutcome> {
  const final = ctx.output("pm_final", stepOutputs.pm);
  if (!final) throw new Error("The final decision is missing.");
  const state = await loadFundState(ctx.deps.db, ctx.run.asOf, {
    symbols: final.actions.map((a) => a.symbol),
  });
  const addedHolds = state.portfolio.positions
    .map((p) => p.symbol)
    .filter((s) => !final.actions.some((a) => a.symbol === s));
  const actions = [...final.actions, ...addedHolds.map(holdFor)];
  const { plan, screenRows } = check(ctx, state, actions);
  const proForma = await proFormaOf(ctx, state, plan.planned, screenRows);
  const output: FinalChecksOutput = { plan, proForma, actions, addedHolds };
  const say = sayIn(ctx.deps.language);
  const dropped = plan.blocked.length;
  return {
    status: "done",
    input: { actions: actions.length, addedHolds },
    output,
    memo: memos.checks(say, plan, optionalInstrumentOf(state.instruments), [
      addedHolds.length > 0
        ? say(
            `No decision for ${addedHolds.join(", ")}: recorded as a hold.`,
            `${addedHolds.join("、")} 没有决定，记为持有。`,
          )
        : "",
      dropped > 0
        ? say(
            `${String(dropped)} order(s) dropped because their stock has a breach.`,
            `${String(dropped)} 笔委托因违反硬性规则被删除。`,
          )
        : "",
      exposureLines(say, proForma),
    ]),
  };
}

async function riskSignoff(ctx: StepContext): Promise<StepOutcome> {
  const { db, language } = ctx.deps;
  const say = sayIn(language);
  const checks = ctx.output("checks_final", stepOutputs.finalChecks);
  if (!checks) throw new Error("The final checks are missing.");
  if (checks.plan.planned.length === 0) {
    return {
      status: "skipped",
      memo: say("No order to sign off.", "没有需要签核的委托。"),
    };
  }
  const state = await loadFundState(db, ctx.run.asOf);
  const sections: PackSection[] = [
    {
      title: "Meeting",
      body: { asOf: state.asOf, data: [dataNotes.record, dataNotes.noLookups] },
    },
    {
      title: "Your review",
      body: ctx.output("risk_review", stepOutputs.review),
    },
    {
      title: "The PM's final decision, with its reply to you",
      body: ctx.output("pm_final", stepOutputs.pm),
    },
    {
      title: "Final orders that passed the hard rules",
      body: packParts.plannedOrders(checks.plan.planned, state.instruments),
    },
    {
      title: "Breaches that code found in the final decision",
      body: checks.plan.violations,
    },
    { title: "Exposure if these orders all fill", body: checks.proForma },
    { title: "Risk policy", body: packParts.policy(state.riskPolicy) },
  ];
  const reply = await callSeat(ctx, {
    role: "risk",
    instructions: prompts.riskSignoff({ asOf: ctx.run.asOf, language }),
    schema: riskSignoffSchema,
    sections,
    webSearch: null,
  });
  const symbols = new Set(checks.plan.planned.map((o) => o.symbol));
  const signoff: RiskSignoff = {
    ...reply.output,
    verdicts: reply.output.verdicts
      .map((v) => ({ ...v, symbol: normalise(v.symbol) }))
      .filter((v) => symbols.has(v.symbol)),
  };
  const unanswered = [...symbols].filter(
    (s) => !signoff.verdicts.some((v) => v.symbol === s),
  );
  return {
    status: "done",
    input: reply.input,
    output: signoff,
    memo: [
      memos.signoff(say, signoff),
      unanswered.length > 0
        ? say(
            `No verdict for ${unanswered.join(", ")}: approved by default.`,
            `${unanswered.join("、")} 没有裁定，默认批准。`,
          )
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    model: reply.model,
    usage: reply.usage,
  };
}

/** The steps of the daily meeting after the first three. */
export const dailySteps = {
  pmDraft,
  checksDraft,
  riskReview,
  pmFinal,
  checksFinal,
  riskSignoff,
};
