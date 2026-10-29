const exponents = new Map<string, number>();

/**
 * How many decimal places a major unit of `currency` has: 2 for GBP, 0 for
 * JPY, 3 for KWD. Throws for a code that is not an ISO 4217 currency.
 */
export function currencyExponent(currency: string): number {
  let exponent = exponents.get(currency);
  if (exponent === undefined) {
    exponent = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits;
    if (exponent === undefined) {
      throw new Error(`No exponent for currency ${currency}`);
    }
    exponents.set(currency, exponent);
  }
  return exponent;
}
