import type { RiskPolicy } from "../contracts/risk-policy-schema.ts";
import { GUARDRAILS } from "../guardrails.ts";

export type RiskLimits = RiskPolicy["limits"];

/** The limits when there is no risk policy yet: the guardrails only. */
export const GUARDRAIL_LIMITS: RiskLimits = {
  maxPositionWeightPct: GUARDRAILS.maxPositionWeightPct,
  maxSectorWeightPct: GUARDRAILS.maxSectorWeightPct,
  minCashWeightPct: 0,
  maxUsdWeightPct: 100,
  maxPositions: Number.MAX_SAFE_INTEGER,
};

function between(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/** The policy's limits inside the guardrails: it may tighten them, never loosen them. */
export function clampLimits(limits: RiskLimits): RiskLimits {
  return {
    maxPositionWeightPct: between(
      limits.maxPositionWeightPct,
      0,
      GUARDRAILS.maxPositionWeightPct,
    ),
    maxSectorWeightPct: between(
      limits.maxSectorWeightPct,
      0,
      GUARDRAILS.maxSectorWeightPct,
    ),
    minCashWeightPct: between(limits.minCashWeightPct, 0, 100),
    maxUsdWeightPct: between(limits.maxUsdWeightPct, 0, 100),
    maxPositions: Math.max(0, Math.floor(limits.maxPositions)),
  };
}
