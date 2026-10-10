import { fromMinorUnits } from "../domain/money/to-minor-units.ts";

const formatters = new Map<string, Intl.NumberFormat>();

/**
 * A short amount for an axis tick, such as `£1.05M`, with just enough
 * figures that ticks `step` minor units apart never read the same.
 */
export function formatAxisMoney(
  minor: number,
  step: number,
  currency: string,
  locale: string,
): string {
  const magnitude = Math.floor(Math.log10(Math.max(Math.abs(minor), 1)));
  const stepMagnitude = Math.floor(Math.log10(Math.max(Math.abs(step), 1)));
  const digits = Math.min(Math.max(magnitude - stepMagnitude + 1, 2), 6);
  const key = `${locale}|${currency}|${String(digits)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumSignificantDigits: digits,
    });
    formatters.set(key, formatter);
  }
  return formatter.format(fromMinorUnits(minor, currency));
}
