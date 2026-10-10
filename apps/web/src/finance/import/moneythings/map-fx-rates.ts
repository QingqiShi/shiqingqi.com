import { coreDataDay } from "./core-data-day.ts";
import type { FxRateRow } from "./types.ts";
import type { MapOptions } from "./types.ts";
import type { SourceData } from "./types.ts";

/**
 * FX quotes as rates to the base currency: `X/GBP` as given and `GBP/X`
 * inverted, both stored as base X, quote GBP. On one day the latest quote
 * wins.
 */
export function mapFxRates(
  source: SourceData,
  options: MapOptions,
): FxRateRow[] {
  const latest = new Map<string, { time: number; row: FxRateRow }>();
  for (const quote of source.fxRates) {
    const [from, to] = quote.symbol.split("/").map((code) => code.trim());
    if (!from || !to || quote.price <= 0) continue;
    let currency: string;
    let rate: number;
    if (to === options.baseCurrency && from !== options.baseCurrency) {
      currency = from;
      rate = quote.price;
    } else if (from === options.baseCurrency && to !== options.baseCurrency) {
      currency = to;
      rate = 1 / quote.price;
    } else {
      continue;
    }
    const on = coreDataDay(quote.updateTime, options.timeZone);
    const key = `${currency}:${on}`;
    const current = latest.get(key);
    if (current && current.time > quote.updateTime) continue;
    latest.set(key, {
      time: quote.updateTime,
      row: {
        householdId: options.householdId,
        base: currency,
        quote: options.baseCurrency,
        on,
        // The column is numeric(18, 8): round here so reads equal writes.
        rate: Number(rate.toFixed(8)),
        source: "import",
        version: 0,
      },
    });
  }
  return [...latest.values()]
    .map(({ row }) => row)
    .sort((a, b) => a.base.localeCompare(b.base) || a.on.localeCompare(b.on));
}
