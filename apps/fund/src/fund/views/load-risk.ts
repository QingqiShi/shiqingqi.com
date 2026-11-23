import { desc, eq } from "drizzle-orm";
import "server-only";
import { z } from "zod";
import type { FundDb } from "#src/db/types.ts";
import {
  RISK_METRICS,
  riskMetricSchema,
  riskPolicySchema,
  type RiskPolicy,
} from "../contracts/risk-policy-schema.ts";
import { riskPolicyVersions, runs } from "../fund-schema.ts";
import { getFundamentals } from "../market/get-fundamentals.ts";
import {
  checkGuardrails,
  type GuardrailCheck,
} from "../risk/check-guardrails.ts";
import {
  checkRiskPolicy,
  type RiskPolicyCheck,
} from "../risk/check-risk-policy.ts";
import { measureExposure, type Exposure } from "../risk/measure-exposure.ts";
import { RISK_WINDOWS } from "../risk/risk-windows.ts";
import { decidedOn } from "./decided-on.ts";
import { loadFundState } from "./load-fund-state.ts";
import { loadLatestScreen } from "./load-latest-screen.ts";

export interface RiskView {
  /** The fund has money. */
  started: boolean;
  policy: {
    version: number;
    /** The day of the meeting that wrote it, `YYYY-MM-DD`. */
    decidedOn: string;
    changeNote: string | null;
    runId: string | null;
    body: RiskPolicy;
  } | null;
  /** Null before the fund has money. */
  exposure: Exposure | null;
  /** Null without a policy. Before the fund has money, nothing in it is measured. */
  check: RiskPolicyCheck | null;
  /** The owner's guardrails, measured on `exposure` where a number exists. */
  guardrails: GuardrailCheck[];
  /** The names of the held stocks, by symbol. */
  names: Record<string, string>;
}

const SESSIONS = RISK_WINDOWS.returnSessions + 20;
const noMetrics = z.record(riskMetricSchema, z.null());

/** An exposure with no number measured, for a fund that has no money yet. */
function unmeasured(asOf: string): Exposure {
  return {
    asOf,
    navGbp: 0,
    metrics: noMetrics.parse(
      Object.fromEntries(RISK_METRICS.map((metric) => [metric, null])),
    ),
    bySector: [],
    byCurrency: [],
    positions: [],
    unlockSchedule: [],
    earningsInLock: [],
  };
}

/** The risk policy and the exposure measured on today's portfolio against it. */
export async function loadRisk(db: FundDb): Promise<RiskView> {
  const [state, policyRows, screen] = await Promise.all([
    loadFundState(db, { history: "none", sessions: SESSIONS }),
    db
      .select({
        version: riskPolicyVersions.version,
        policy: riskPolicyVersions.policy,
        changeNote: riskPolicyVersions.changeNote,
        runId: riskPolicyVersions.runId,
        createdAt: riskPolicyVersions.createdAt,
        runAsOf: runs.asOf,
      })
      .from(riskPolicyVersions)
      .leftJoin(runs, eq(runs.id, riskPolicyVersions.runId))
      .orderBy(desc(riskPolicyVersions.version))
      .limit(1),
    loadLatestScreen(db),
  ]);
  const policyRow = policyRows.at(0);
  const parsed =
    policyRow === undefined
      ? null
      : riskPolicySchema.safeParse(policyRow.policy);
  const policy =
    policyRow === undefined || parsed === null || !parsed.success
      ? null
      : {
          version: policyRow.version,
          decidedOn: decidedOn(policyRow),
          changeNote: policyRow.changeNote,
          runId: policyRow.runId,
          body: parsed.data,
        };

  const held = state.portfolio.positions.map((position) => position.symbol);
  const names = Object.fromEntries(
    state.instruments
      .filter((instrument) => held.includes(instrument.symbol))
      .map((instrument) => [instrument.symbol, instrument.name]),
  );
  if (state.startedOn === null) {
    return {
      started: false,
      policy,
      exposure: null,
      check:
        policy === null
          ? null
          : checkRiskPolicy(unmeasured(state.today), policy.body),
      guardrails: checkGuardrails(null),
      names,
    };
  }

  const exposure = measureExposure({
    portfolio: state.portfolio,
    instruments: state.instruments,
    bars: state.bars,
    fx: state.fx,
    screenRows: screen?.result.rows ?? [],
    fundamentals: await getFundamentals(db, held, { asOf: state.today }),
    asOf: state.today,
  });
  return {
    started: true,
    policy,
    exposure,
    check: policy === null ? null : checkRiskPolicy(exposure, policy.body),
    guardrails: checkGuardrails(exposure),
    names,
  };
}
