import type { RiskMetric } from "../contracts/risk-policy-schema.ts";
import { formatPercent } from "./format-percent.ts";

/**
 * A measured risk number in its own unit: a weight or a volatility in
 * percent, a beta with two decimals, a count, or a tilt in percentile
 * points from the middle of the universe, with its sign.
 */
export function formatMetric(metric: RiskMetric, value: number): string {
  if (metric.endsWith("_pct")) return formatPercent(value);
  if (metric === "equity_beta") return value.toFixed(2);
  if (metric === "position_count") return String(Math.round(value));
  const rounded = Math.round(value);
  if (rounded > 0) return `+${String(rounded)}`;
  if (rounded < 0) return `−${String(Math.abs(rounded))}`;
  return "0";
}
