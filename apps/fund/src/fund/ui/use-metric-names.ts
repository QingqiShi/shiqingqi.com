import { t } from "@tuja/i18n";
import type { RiskMetric } from "../contracts/risk-policy-schema.ts";
import { GUARDRAILS } from "../guardrails.ts";

/** What each measured risk number is, in words. */
export function useMetricNames(): Record<RiskMetric, string> {
  return {
    equity_beta: t({ en: "Beta to the market", zh: "相对市场的贝塔" }),
    annual_volatility_pct: t({ en: "Yearly volatility", zh: "年化波动率" }),
    cash_weight_pct: t({ en: "Cash", zh: "现金占比" }),
    largest_position_pct: t({ en: "Largest position", zh: "最大单一持仓" }),
    largest_sector_pct: t({ en: "Largest sector", zh: "最大行业" }),
    usd_weight_pct: t({ en: "In US dollars", zh: "美元资产占比" }),
    locked_weight_pct: t({
      en: "Locked for {n} days",
      zh: "处于 {n} 天锁定期",
    }).replace("{n}", String(GUARDRAILS.minHoldDays)),
    position_count: t({ en: "Positions", zh: "持仓数" }),
    value_tilt: t({ en: "Value tilt", zh: "价值倾向" }),
    quality_tilt: t({ en: "Quality tilt", zh: "质量倾向" }),
    momentum_tilt: t({ en: "Momentum tilt", zh: "动量倾向" }),
    growth_tilt: t({ en: "Growth tilt", zh: "成长倾向" }),
    low_volatility_tilt: t({ en: "Low-volatility tilt", zh: "低波动倾向" }),
  };
}
