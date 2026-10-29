/** One exchange rate: one unit of `base` is worth `rate` units of `quote` on `on`. */
export interface FxRateInput {
  readonly base: string;
  readonly quote: string;
  readonly on: string;
  readonly rate: number;
}

/**
 * The other currency of `row` and how many units of `baseCurrency` one unit
 * of it is worth. A row counts in either orientation (`X/base` as given,
 * `base/X` inverted); a row between two other currencies gives null.
 */
export function rateToBaseOf(
  row: FxRateInput,
  baseCurrency: string,
): { currency: string; rate: number } | null {
  if (row.base === row.quote) return null;
  if (row.quote === baseCurrency) return { currency: row.base, rate: row.rate };
  if (row.base === baseCurrency) {
    return { currency: row.quote, rate: 1 / row.rate };
  }
  return null;
}
