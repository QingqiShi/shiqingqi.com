import { currencyExponent } from "./currency-exponent.ts";
import { fromMinorUnits } from "./to-minor-units.ts";

interface FormatMoneyOptions {
  /** `"exceptZero"` shows `+£5.00` for money in; the default shows a sign only on money out. */
  signDisplay?: "auto" | "always" | "exceptZero" | "never";
  /** `"code"` shows `GBP 5.00`; the default shows `£5.00`. */
  currencyDisplay?: "symbol" | "narrowSymbol" | "code";
  /** `"compact"` shows `£1.1M`, for chart axes and tight tiles. */
  notation?: "standard" | "compact";
}

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(
  currency: string,
  locale: string,
  { signDisplay, currencyDisplay, notation }: FormatMoneyOptions,
) {
  const key = `${locale}|${currency}|${signDisplay ?? ""}|${currencyDisplay ?? ""}|${notation ?? ""}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    const exponent = currencyExponent(currency);
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      signDisplay,
      currencyDisplay,
      notation,
      ...(notation === "compact"
        ? { maximumFractionDigits: 1 }
        : {
            minimumFractionDigits: exponent,
            maximumFractionDigits: exponent,
          }),
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
