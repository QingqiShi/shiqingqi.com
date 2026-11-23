import type { AnalystNote } from "../../contracts/analyst-note-schema.ts";
import type { FundThesis } from "../../contracts/fund-thesis-schema.ts";
import type { MacroBrief } from "../../contracts/macro-brief-schema.ts";
import type {
  PmAction,
  PmDecision,
} from "../../contracts/pm-decision-schema.ts";
import type { RiskPolicy } from "../../contracts/risk-policy-schema.ts";
import type {
  RiskReview,
  RiskSignoff,
} from "../../contracts/risk-review-schema.ts";
import { AgentCallError } from "../agent-call-error.ts";
import type { AgentCaller, AgentRequest } from "../types.ts";

/** An answer that depends on the request. */
class Computed {
  readonly compute: (request: AgentRequest<unknown>) => unknown;
  constructor(compute: (request: AgentRequest<unknown>) => unknown) {
    this.compute = compute;
  }
}

/** A value for the step's schema, or an `Error` to throw. */
type Answer = object;

const THESIS: FundThesis = {
  summary: "Quality at a fair price.",
  philosophy: "Own good businesses.",
  objective: "Beat the benchmark.",
  edge: "Patience.",
  horizon: "Years.",
  portfolioConstruction: {
    minPositions: 5,
    maxPositions: 10,
    typicalWeightPct: 10,
    cashPolicy: "Some cash.",
  },
  plan: [{ phase: "Build", description: "Buy slowly." }],
  screenWeights: {
    value: 1,
    quality: 2,
    momentum: 1,
    growth: 1,
    lowVolatility: 1,
  },
  holdingDiscipline: "Hold 30 days.",
  sellDiscipline: "Sell when wrong.",
};

const POLICY: RiskPolicy = {
  statement: "Take equity risk on purpose.",
  factors: [
    {
      key: "cash",
      name: "Cash",
      stance: "limit",
      rationale: "Keep some.",
      metric: "cash_weight_pct",
      targetMin: 5,
      targetMax: 100,
    },
  ],
  limits: {
    maxPositionWeightPct: 15,
    maxSectorWeightPct: 40,
    minCashWeightPct: 5,
    maxUsdWeightPct: 60,
    maxPositions: 10,
  },
};

const BRIEF: MacroBrief = {
  summary: "Calm markets.",
  regime: "Range.",
  themes: [],
  risks: [],
  calendar: [],
  nominations: [{ symbol: "NOPE", reason: "Not in the universe." }],
  sources: [],
};

function note(symbol: string): AnalystNote {
  return {
    symbol,
    stance: "buy",
    conviction: 3,
    summary: `A note on ${symbol}.`,
    bull: [],
    bear: [],
    earnings: "Fine.",
    valuation: "Fair.",
    news: [],
    catalysts: [],
    thesisCheck: "not_held",
    thesisCheckReason: "",
    entryLow: null,
    entryHigh: null,
    riskFlags: [],
    sources: [],
  };
}

function testAction(
  action: Pick<PmAction, "symbol" | "action"> & Partial<PmAction>,
): PmAction {
  return {
    targetWeightPct: null,
    limitPrice: null,
    validSessions: null,
    onExpiry: null,
    repriceLimit: null,
    unfilledPlan: null,
    rationale: `The PM's reason for ${action.action} ${action.symbol}.`,
    thesis: null,
    thesisChangeNote: null,
    ...action,
  };
}

/** A buy of AAPL that passes every rule, and a buy of SHEL.L priced in pounds, not pence. */
const DECISION: PmDecision = {
  marketView: "Fine.",
  planCheck: "On plan.",
  actions: [
    testAction({
      symbol: "AAPL",
      action: "buy",
      targetWeightPct: 10,
      limitPrice: 199,
      validSessions: 3,
      onExpiry: "cancel",
      unfilledPlan: "Let it lapse and look again.",
      thesis: {
        summary: "Cash machine.",
        drivers: ["Services"],
        invalidation: ["Services shrink"],
        horizonMonths: 12,
        valuation: "Fair at 25x.",
      },
    }),
    testAction({
      symbol: "SHEL.L",
      action: "buy",
      targetWeightPct: 5,
      limitPrice: 26,
      validSessions: 3,
      onExpiry: "cancel",
      unfilledPlan: "Lapse.",
      thesis: {
        summary: "Energy.",
        drivers: [],
        invalidation: [],
        horizonMonths: 12,
        valuation: "Cheap.",
      },
    }),
  ],
  noActionReason: null,
  questions: [],
  replyToRisk: null,
  requestStrategyReview: false,
  strategyReviewReason: null,
};

const REVIEW: RiskReview = {
  overall: "Fine.",
  verdicts: [],
  factorNotes: [],
  portfolioConcerns: [],
  requiredChanges: [],
};

const SIGNOFF: RiskSignoff = {
  statement: "Approved.",
  verdicts: [{ symbol: "AAPL", verdict: "approved", reason: "Inside policy." }],
};

const USAGE = {
  inputTokens: 100,
  outputTokens: 10,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  webSearches: 0,
  costUsd: 0,
};

/** The canned answer of each seat; a key `analyst` answers every `analyst:<SYMBOL>`. */
const CANNED_ANSWERS: Record<string, Answer> = {
  macro: BRIEF,
  pm_strategy: { ...THESIS, changeNote: null },
  risk_strategy: { ...POLICY, changeNote: null },
  analyst: new Computed((request) =>
    note(request.stepKey.slice("analyst:".length)),
  ),
  pm_draft: DECISION,
  risk_review: REVIEW,
  pm_final: DECISION,
  risk_signoff: SIGNOFF,
};

/**
 * A model that gives each step its canned answer, checked by the step's own
 * schema, and records each request. An `Error` answer is thrown.
 */
export function fakeAgent(
  overrides: Record<string, Answer> = {},
  calls: AgentRequest<unknown>[] = [],
): AgentCaller {
  const answers = new Map(Object.entries({ ...CANNED_ANSWERS, ...overrides }));
  return async (request) => {
    calls.push(request);
    const key = answers.has(request.stepKey)
      ? request.stepKey
      : request.stepKey.split(":")[0];
    const answer = answers.get(key);
    if (answer instanceof Error) throw answer;
    if (answer === undefined) {
      throw new AgentCallError(
        "api",
        `No canned answer for ${request.stepKey}.`,
        {
          transient: false,
        },
      );
    }
    const value = answer instanceof Computed ? answer.compute(request) : answer;
    return Promise.resolve({
      output: request.schema.parse(value),
      model: "fake-model",
      usage: USAGE,
    });
  };
}
