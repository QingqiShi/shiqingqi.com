import { describe, expect, it } from "vitest";
import type { RiskFactor } from "../contracts/risk-policy-schema.ts";
import { checkRiskPolicy } from "./check-risk-policy.ts";
import { measureExposure } from "./measure-exposure.ts";

function factor(
  values: Partial<RiskFactor> & Pick<RiskFactor, "key">,
): RiskFactor {
  return {
    name: values.key,
    stance: "limit",
    rationale: "",
    metric: null,
    targetMin: null,
    targetMax: null,
    ...values,
  };
}

describe("checkRiskPolicy", () => {
  it("reports how far a factor is outside its range and leaves the unmeasured open", () => {
    const allCash = measureExposure({
      portfolio: {
        asOf: "2025-03-03",
        cashGbp: 20_000,
        realisedPnlGbp: 0,
        dividendsGbp: 0,
        navGbp: 20_000,
        cashWeightPct: 100,
        gbpUsd: 1.25,
        positions: [],
      },
      instruments: [],
      bars: new Map(),
      fx: [],
      screenRows: [],
      fundamentals: new Map(),
      asOf: "2025-03-03",
    });

    const check = checkRiskPolicy(allCash, {
      statement: "",
      factors: [
        factor({ key: "cash", metric: "cash_weight_pct", targetMax: 20 }),
        factor({ key: "value", metric: "value_tilt", targetMin: 10 }),
        factor({ key: "theme" }),
      ],
      limits: {
        maxPositionWeightPct: 15,
        maxSectorWeightPct: 35,
        minCashWeightPct: 5,
        maxUsdWeightPct: 60,
        maxPositions: 20,
      },
    });

    expect(
      check.factors.map(({ factor: { key }, ...rest }) => ({ key, ...rest })),
    ).toEqual([
      {
        key: "cash",
        measured: 100,
        inside: false,
        outsideBy: 80,
        side: "above",
      },
      {
        key: "value",
        measured: null,
        inside: null,
        outsideBy: null,
        side: null,
      },
      {
        key: "theme",
        measured: null,
        inside: null,
        outsideBy: null,
        side: null,
      },
    ]);
    expect(check.limits.every((limit) => limit.holds)).toBe(true);
  });
});
