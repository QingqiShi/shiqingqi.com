import { toEpochDay } from "../dates/to-epoch-day.ts";
import { currencyExponent } from "../money/currency-exponent.ts";

/** One `fx_rates` row: one unit of `base` is worth `rate` units of `quote` on `on`. */
export interface FxRateInput {
  readonly base: string;
  readonly quote: string;
  readonly on: string;
  readonly rate: number;
}

export interface FxIndex {
  readonly baseCurrency: string;
  /** Units of the base currency one unit of `currency` is worth on `epochDay`. */
  rateToBase: (currency: string, epochDay: number) => number;
  /** `amountMinor` of `currency` in minor units of the base currency, not rounded. */
  toBase: (amountMinor: number, currency: string, epochDay: number) => number;
}

interface RateSeries {
  days: Int32Array;
  rates: Float64Array;
  minorFactor: number;
}

function buildSeries(
  points: { day: number; rate: number }[],
  currency: string,
  baseCurrency: string,
): RateSeries {
  points.sort((a, b) => a.day - b.day);
  const days: number[] = [];
  const rates: number[] = [];
  for (const point of points) {
    if (days.at(-1) === point.day) {
      rates[rates.length - 1] = point.rate;
    } else {
      days.push(point.day);
      rates.push(point.rate);
    }
  }
  return {
    days: Int32Array.from(days),
    rates: Float64Array.from(rates),
    minorFactor:
      10 ** (currencyExponent(baseCurrency) - currencyExponent(currency)),
  };
}

/**
 * Indexes rates that convert to `baseCurrency`. A row in either orientation
 * counts (`X/base` as given, `base/X` inverted); rows between two other
 * currencies are ignored. The rate on a day is the latest on or before it.
 */
export function createFxIndex(
  rows: readonly FxRateInput[],
  baseCurrency: string,
): FxIndex {
  const points = new Map<string, { day: number; rate: number }[]>();
  for (const row of rows) {
    const currency =
      row.quote === baseCurrency
        ? row.base
        : row.base === baseCurrency
          ? row.quote
          : null;
    if (currency === null || currency === baseCurrency) continue;
    const rate = row.quote === baseCurrency ? row.rate : 1 / row.rate;
    const list = points.get(currency) ?? [];
    list.push({ day: toEpochDay(row.on), rate });
    points.set(currency, list);
  }

  const series = new Map<string, RateSeries>();
  for (const [currency, list] of points) {
    series.set(currency, buildSeries(list, currency, baseCurrency));
  }

  function lookup(currency: string, epochDay: number) {
    const found = series.get(currency);
    // Same as the MoneyThings app: with no rate on or before the day, use
    // the earliest rate; with no rate at all, count the amount at par.
    if (!found) return { rate: 1, minorFactor: 1 };
    const { days, rates, minorFactor } = found;
    let low = 0;
    let high = days.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (days[middle] <= epochDay) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return { rate: rates[Math.max(low - 1, 0)], minorFactor };
  }

  return {
    baseCurrency,
    rateToBase(currency, epochDay) {
      return currency === baseCurrency ? 1 : lookup(currency, epochDay).rate;
    },
    toBase(amountMinor, currency, epochDay) {
      if (currency === baseCurrency || amountMinor === 0) return amountMinor;
      const { rate, minorFactor } = lookup(currency, epochDay);
      return amountMinor * rate * minorFactor;
    },
  };
}
