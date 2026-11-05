import { formatMoney } from "../domain/money/format-money.ts";

/** A figure of the Month screen in whole units: `+£1,234` and `-£56`, or `£1,234` for a total with `"auto"`. */
export function wholeMoney(
  minor: number,
  currency: string,
  locale: string,
  signDisplay: "auto" | "exceptZero" = "exceptZero",
): string {
  return formatMoney(Math.round(minor), currency, locale, {
    signDisplay,
    wholeUnits: true,
  });
}
