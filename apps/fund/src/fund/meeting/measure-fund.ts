import type { FundDb } from "#src/db/types.ts";
import type { RiskPolicy } from "../contracts/risk-policy-schema.ts";
import { getFundamentals } from "../market/get-fundamentals.ts";
import { checkRiskPolicy } from "../risk/check-risk-policy.ts";
import { measureExposure } from "../risk/measure-exposure.ts";
import type { ScreenRow, ValuedPortfolio } from "../types.ts";
import type { FundState } from "./load-fund-state.ts";
import { packParts } from "./pack-parts.ts";

/**
 * The measured exposure of `portfolio` (today's or a pro-forma one) and its
 * check against the policy, as an agent reads it. `state.bars` must hold the
 * bars of every stock in `portfolio`.
 */
export async function measureFund(
  db: FundDb,
  state: FundState,
  portfolio: ValuedPortfolio,
  screenRows: readonly ScreenRow[],
  policy: RiskPolicy | null,
) {
  const fundamentals = await getFundamentals(
    db,
    portfolio.positions.map((p) => p.symbol),
    { asOf: state.asOf },
  );
  const exposure = measureExposure({
    portfolio,
    instruments: state.instruments,
    bars: state.bars,
    fx: state.fx,
    screenRows,
    fundamentals,
    asOf: state.asOf,
  });
  return packParts.exposure(
    exposure,
    policy ? checkRiskPolicy(exposure, policy) : null,
  );
}
