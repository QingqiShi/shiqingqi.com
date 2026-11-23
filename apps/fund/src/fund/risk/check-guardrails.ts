import type { RiskMetric } from "../contracts/risk-policy-schema.ts";
import { GUARDRAILS } from "../guardrails.ts";
import { RISK_TOLERANCE } from "./check-risk-policy.ts";
import type { Exposure } from "./measure-exposure.ts";

export type GuardrailKey =
  "position" | "sector" | "hold" | "distance" | "sessions" | "size";

export interface GuardrailCheck {
  key: GuardrailKey;
  /** In the unit of the rule: percent, days, sessions or GBP. */
  limit: number;
  /** The measured number that the rule bounds, or null when none exists. */
  metric: RiskMetric | null;
  measured: number | null;
  /** Null when nothing is measured, or when the rule binds only at a buy. */
  holds: boolean | null;
}

/** Each of the owner's guardrails, with the number measured on `exposure` where one exists. */
export function checkGuardrails(
  exposure: Pick<Exposure, "metrics"> | null,
): GuardrailCheck[] {
  const measured = (metric: RiskMetric) => exposure?.metrics[metric] ?? null;
  const largestPosition = measured("largest_position_pct");
  const largestSector = measured("largest_sector_pct");
  const rule = (key: GuardrailKey, limit: number): GuardrailCheck => ({
    key,
    limit,
    metric: null,
    measured: null,
    holds: null,
  });
  return [
    {
      key: "position",
      limit: GUARDRAILS.maxPositionWeightPct,
      metric: "largest_position_pct",
      measured: largestPosition,
      // The rule binds the weight right after a buy. A later rise in price
      // can take a position above it, and that is not a breach.
      holds: null,
    },
    {
      key: "sector",
      limit: GUARDRAILS.maxSectorWeightPct,
      metric: "largest_sector_pct",
      measured: largestSector,
      holds:
        largestSector === null
          ? null
          : largestSector <= GUARDRAILS.maxSectorWeightPct + RISK_TOLERANCE,
    },
    rule("hold", GUARDRAILS.minHoldDays),
    rule("distance", GUARDRAILS.maxLimitDistancePct),
    rule("sessions", GUARDRAILS.maxOrderSessions),
    rule("size", GUARDRAILS.minOrderGbp),
  ];
}
