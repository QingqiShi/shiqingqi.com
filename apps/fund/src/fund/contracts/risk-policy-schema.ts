import { z } from "zod";

/** The numbers that code measures on the portfolio. */
export const RISK_METRICS = [
  "equity_beta",
  "annual_volatility_pct",
  "cash_weight_pct",
  "largest_position_pct",
  "largest_sector_pct",
  "usd_weight_pct",
  "locked_weight_pct",
  "position_count",
  "value_tilt",
  "quality_tilt",
  "momentum_tilt",
  "growth_tilt",
  "low_volatility_tilt",
] as const;
export const riskMetricSchema = z.enum(RISK_METRICS);
export type RiskMetric = z.infer<typeof riskMetricSchema>;

/**
 * One risk the fund takes a position on. `seek` and `accept` are risks the
 * fund is paid for or lives with on purpose; `limit` and `avoid` are not.
 */
export const riskFactorSchema = z.object({
  key: z.string(),
  name: z.string(),
  stance: z.enum(["seek", "accept", "limit", "avoid"]),
  rationale: z.string(),
  /** The measured number, or null for a risk only people can judge. */
  metric: riskMetricSchema.nullable(),
  targetMin: z.number().nullable(),
  targetMax: z.number().nullable(),
});
export type RiskFactor = z.infer<typeof riskFactorSchema>;

/** The risk budget, written by the risk officer. Limits stay inside the guardrails. */
export const riskPolicySchema = z.object({
  statement: z.string(),
  factors: z.array(riskFactorSchema),
  limits: z.object({
    maxPositionWeightPct: z.number(),
    maxSectorWeightPct: z.number(),
    minCashWeightPct: z.number(),
    maxUsdWeightPct: z.number(),
    maxPositions: z.number().int(),
  }),
});
export type RiskPolicy = z.infer<typeof riskPolicySchema>;
