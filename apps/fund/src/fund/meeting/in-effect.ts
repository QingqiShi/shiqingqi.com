import type { RiskReview } from "../contracts/risk-review-schema.ts";
import type { StepUsage } from "../contracts/step-usage-schema.ts";
import type { VersionReview } from "../contracts/version-review-schema.ts";
import { clampLimits } from "../orders/clamp-limits.ts";
import type { FundState } from "./load-fund-state.ts";
import { StepFailure } from "./step-failure.ts";
import { stepOutputs } from "./step-outputs.ts";
import type { StepContext } from "./types.ts";

/**
 * Checks a seat's review of the fund thesis or the risk policy: a revision
 * must give the new text, and say what changed when an earlier version
 * exists. A `keep` carries no text, and a first version no change note.
 */
export function settleReview<T>(
  review: VersionReview<T>,
  {
    what,
    hasEarlier,
    reply,
  }: {
    what: string;
    hasEarlier: boolean;
    reply: { input: unknown; usage: StepUsage; model: string };
  },
): VersionReview<T> {
  if (review.verdict === "keep") {
    if (!hasEarlier) {
      throw new StepFailure(
        `There is no ${what} yet, but the answer kept it instead of writing the first version.`,
        reply,
      );
    }
    return { ...review, revised: null, changeNote: null };
  }
  if (review.revised === null) {
    throw new StepFailure(
      `The answer revised the ${what} but gave no new text.`,
      reply,
    );
  }
  if (hasEarlier && !review.changeNote?.trim()) {
    throw new StepFailure(
      `The answer revised the ${what} but did not say what changed and why.`,
      reply,
    );
  }
  return hasEarlier ? review : { ...review, changeNote: null };
}

const LIMIT_KEYS = [
  "maxPositionWeightPct",
  "maxSectorWeightPct",
  "minCashWeightPct",
  "maxUsdWeightPct",
  "maxPositions",
] as const;

/** The officer's review with every limit of a policy it writes inside the guardrails, and the limits that code clamped. */
export function clampReview(review: RiskReview): {
  review: RiskReview;
  clamped: string[];
} {
  const policy = review.policyReview.revised;
  if (!policy) return { review, clamped: [] };
  const limits = clampLimits(policy.limits);
  return {
    review: {
      ...review,
      policyReview: {
        ...review.policyReview,
        revised: { ...policy, limits },
      },
    },
    clamped: LIMIT_KEYS.filter((k) => limits[k] !== policy.limits[k]),
  };
}

export interface MeetingState extends FundState {
  /** Which of the two an earlier step of this meeting revised. */
  revisedToday: { fundThesis: boolean; riskPolicy: boolean };
}

/**
 * The fund as a step of the meeting sees it: the fund thesis of the PM's
 * latest answer and the risk policy of the risk review replace the stored
 * versions when they revised them. A step that has not run yet changes
 * nothing, so every step can call this.
 */
export function inEffect(
  ctx: Pick<StepContext, "output">,
  state: FundState,
): MeetingState {
  const pm =
    ctx.output("pm_final", stepOutputs.pm) ??
    ctx.output("pm_draft", stepOutputs.pm);
  const policyReview = ctx.output(
    "risk_review",
    stepOutputs.review,
  )?.policyReview;
  const thesis = pm?.thesisReview.verdict === "revise" ? pm.thesisReview : null;
  const policy = policyReview?.verdict === "revise" ? policyReview : null;
  return {
    ...state,
    fundThesis: thesis?.revised
      ? {
          version: (state.fundThesis?.version ?? 0) + 1,
          body: thesis.revised,
          changeNote: thesis.changeNote,
        }
      : state.fundThesis,
    riskPolicy: policy?.revised
      ? {
          version: (state.riskPolicy?.version ?? 0) + 1,
          policy: policy.revised,
          changeNote: policy.changeNote,
        }
      : state.riskPolicy,
    revisedToday: {
      fundThesis: Boolean(thesis?.revised),
      riskPolicy: Boolean(policy?.revised),
    },
  };
}
