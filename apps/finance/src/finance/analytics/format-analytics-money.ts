import { formatMoney } from "../domain/money/format-money.ts";
import type { AnalyticsKind } from "./types.ts";

/** An analytics amount: a Net amount shows its sign either way. */
export function formatAnalyticsMoney(
  minor: number,
  currency: string,
  locale: string,
  kind: AnalyticsKind,
) {
  return formatMoney(Math.round(minor), currency, locale, {
    signDisplay: kind === "net" ? "exceptZero" : "auto",
  });
}
