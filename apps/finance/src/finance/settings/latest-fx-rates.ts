import { rateToBaseOf } from "../domain/balance/rate-to-base-of.ts";
import type {
  ExchangeRateRow,
  ExchangeRateSource,
} from "../exchange-rates/exchange-rate-row-schema.ts";

/** The newest rate of one currency against the base currency. */
export type LatestFxRate =
  | {
      currency: string;
      /** Units of the base currency one unit of `currency` is worth. */
      rate: number;
      on: string;
      source: ExchangeRateSource;
    }
  | { currency: string; rate: null; on: null; source: null };

/**
 * The newest rate of each currency in `currencies` against `baseCurrency`,
 * read from rows in either orientation (`X/base` as given, `base/X`
 * inverted), as the FX index reads them.
 */
export function latestFxRates(
  rows: Iterable<ExchangeRateRow>,
  currencies: readonly string[],
  baseCurrency: string,
): LatestFxRate[] {
  const latest = new Map<string, Exclude<LatestFxRate, { rate: null }>>();
  for (const row of rows) {
    const toBase = rateToBaseOf(row, baseCurrency);
    if (!toBase) continue;
    const { currency, rate } = toBase;
    const current = latest.get(currency);
    if (
      !current ||
      row.on > current.on ||
      (row.on === current.on && row.quote === baseCurrency)
    ) {
      latest.set(currency, {
        currency,
        rate,
        on: row.on,
        source: row.source,
      });
    }
  }
  return currencies.map(
    (currency) =>
      latest.get(currency) ?? { currency, rate: null, on: null, source: null },
  );
}
