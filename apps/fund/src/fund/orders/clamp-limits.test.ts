import { describe, expect, it } from "vitest";
import { clampLimits } from "./clamp-limits.ts";

describe("clampLimits", () => {
  it("keeps a tighter limit and caps a looser one at the guardrail", () => {
    expect(
      clampLimits({
        maxPositionWeightPct: 35,
        maxSectorWeightPct: 30,
        minCashWeightPct: -5,
        maxUsdWeightPct: 60,
        maxPositions: 15,
      }),
    ).toEqual({
      maxPositionWeightPct: 20,
      maxSectorWeightPct: 30,
      minCashWeightPct: 0,
      maxUsdWeightPct: 60,
      maxPositions: 15,
    });
  });
});
