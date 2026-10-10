import type { FxRateInput } from "../domain/balance/create-fx-index.ts";

/** The newest rate of one currency against the base currency. */
export interface LatestFxRate {
  currency: string;
  /** Units of the base currency one unit of `currency` is worth; null with no rate yet. */
  rate: number | null;
  on: string | null;
}

/**
 * The newest rate of each currency in `currencies` against `baseCurrency`,
 * read from rows in either orientation (`X/base` as given, `base/X`
 * inverted), as the FX index reads them.
 */
export function latestFxRates(
  rows: Iterable<FxRateInput>,
  currencies: readonly string[],
  baseCurrency: string,
): LatestFxRate[] {
  const latest = new Map<string, { rate: number; on: string }>();
  for (const row of rows) {
    const currency =
      row.quote === baseCurrency
        ? row.base
        : row.base === baseCurrency
          ? row.quote
          : null;
    if (currency === null || currency === baseCurrency) continue;
    const rate = row.quote === baseCurrency ? row.rate : 1 / row.rate;
    const current = latest.get(currency);
    if (
      !current ||
      row.on > current.on ||
      (row.on === current.on && row.quote === baseCurrency)
    ) {
      latest.set(currency, { rate, on: row.on });
    }
  }
  return currencies.map((currency) => ({
    currency,
    rate: latest.get(currency)?.rate ?? null,
    on: latest.get(currency)?.on ?? null,
  }));
}

/** A rate a person typed, such as `0.79` or `1,234.5`; null unless it is a number above zero. */
export function parseFxRate(text: string): number | null {
  const plain = text.normalize("NFKC").trim().replaceAll(",", "");
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(plain)) return null;
  const rate = Number(plain);
  return rate >= 1e-8 && rate <= 1e9 ? rate : null;
}
