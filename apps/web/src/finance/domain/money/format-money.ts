import { currencyExponent } from "./currency-exponent.ts";
import { fromMinorUnits } from "./to-minor-units.ts";

interface FormatMoneyOptions {
  /** `"exceptZero"` shows `+£5.00` for money in; the default shows a sign only on money out. */
  signDisplay?: "auto" | "exceptZero";
  /** True shows `£1,137,093` for a summary figure, where pence are noise. */
  wholeUnits?: boolean;
}

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(
  currency: string,
  locale: string,
  { signDisplay, wholeUnits }: FormatMoneyOptions,
) {
  const key = `${locale}|${currency}|${signDisplay ?? ""}|${wholeUnits ? "whole" : ""}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    const exponent = wholeUnits ? 0 : currencyExponent(currency);
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      signDisplay,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Formats integer minor units for display. The float it hands to Intl is
 * exact at the currency's exponent for any amount below 10^13 major units.
 */
export function formatMoney(
  minor: number,
  currency: string,
  locale: string,
  options: FormatMoneyOptions = {},
): string {
  return getFormatter(currency, locale, options).format(
    fromMinorUnits(minor, currency),
  );
}
