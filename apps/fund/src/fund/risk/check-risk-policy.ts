import type {
  RiskFactor,
  RiskMetric,
  RiskPolicy,
} from "../contracts/risk-policy-schema.ts";
import type { Exposure } from "./measure-exposure.ts";

export interface FactorCheck {
  factor: RiskFactor;
  /** Null when the factor has no metric or the metric was not measured. */
  measured: number | null;
  /** Null when there is nothing to compare. A null bound is open. */
  inside: boolean | null;
  /** How far the measured value is outside the range; 0 when inside. */
  outsideBy: number | null;
  side: "below" | "above" | null;
}

export type LimitName = keyof RiskPolicy["limits"];

export interface LimitCheck {
  limit: LimitName;
  metric: RiskMetric;
  bound: "max" | "min";
  value: number;
  measured: number | null;
  holds: boolean | null;
}

export interface RiskPolicyCheck {
  factors: FactorCheck[];
  limits: LimitCheck[];
}

const LIMIT_METRICS: readonly {
  limit: LimitName;
  metric: RiskMetric;
  bound: "max" | "min";
}[] = [
  {
    limit: "maxPositionWeightPct",
    metric: "largest_position_pct",
    bound: "max",
  },
  { limit: "maxSectorWeightPct", metric: "largest_sector_pct", bound: "max" },
  { limit: "minCashWeightPct", metric: "cash_weight_pct", bound: "min" },
  { limit: "maxUsdWeightPct", metric: "usd_weight_pct", bound: "max" },
  { limit: "maxPositions", metric: "position_count", bound: "max" },
];

/** Rounding in sums of weights must not read as a breach. */
export const RISK_TOLERANCE = 1e-9;

export function checkRiskPolicy(
  exposure: Exposure,
  policy: RiskPolicy,
): RiskPolicyCheck {
  const factors = policy.factors.map((factor): FactorCheck => {
    const measured =
      factor.metric === null ? null : exposure.metrics[factor.metric];
    if (measured === null) {
      return { factor, measured, inside: null, outsideBy: null, side: null };
    }
    if (
      factor.targetMin !== null &&
      measured < factor.targetMin - RISK_TOLERANCE
    ) {
      return {
        factor,
        measured,
        inside: false,
        outsideBy: factor.targetMin - measured,
        side: "below",
      };
    }
    if (
      factor.targetMax !== null &&
      measured > factor.targetMax + RISK_TOLERANCE
    ) {
      return {
        factor,
        measured,
        inside: false,
        outsideBy: measured - factor.targetMax,
        side: "above",
      };
    }
    return { factor, measured, inside: true, outsideBy: 0, side: null };
  });

  const limits = LIMIT_METRICS.map(({ limit, metric, bound }): LimitCheck => {
    const value = policy.limits[limit];
    const measured = exposure.metrics[metric];
    const holds =
      measured === null
        ? null
        : bound === "max"
          ? measured <= value + RISK_TOLERANCE
          : measured >= value - RISK_TOLERANCE;
    return { limit, metric, bound, value, measured, holds };
  });

  return { factors, limits };
}
