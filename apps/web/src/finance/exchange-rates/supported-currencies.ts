/**
 * The currencies Finance supports: the ones the European Central Bank
 * publishes a daily rate for, as Frankfurter's `GET /v1/currencies` lists
 * them, EUR included. Each maps to the first day the bank published it.
 */
const FIRST_ECB_DAY: Readonly<Record<string, string>> = {
  AUD: "1999-01-04",
  BRL: "2000-01-13",
  CAD: "1999-01-04",
  CHF: "1999-01-04",
  CNY: "2000-01-13",
  CZK: "1999-01-04",
  DKK: "1999-01-04",
  EUR: "1999-01-04",
  GBP: "1999-01-04",
  HKD: "1999-01-04",
  HUF: "1999-01-04",
  IDR: "1999-01-04",
  ILS: "2000-01-13",
  INR: "2000-01-13",
  ISK: "1999-01-04",
  JPY: "1999-01-04",
  KRW: "1999-01-04",
  MXN: "1999-01-04",
  MYR: "1999-01-04",
  NOK: "1999-01-04",
  NZD: "1999-01-04",
  PHP: "1999-01-04",
  PLN: "1999-01-04",
  RON: "1999-01-04",
  SEK: "1999-01-04",
  SGD: "1999-01-04",
  THB: "1999-01-04",
  TRY: "1999-01-04",
  USD: "1999-01-04",
  ZAR: "1999-01-04",
};

export const SUPPORTED_CURRENCIES: readonly string[] =
  Object.keys(FIRST_ECB_DAY);

export function isSupportedCurrency(code: string): boolean {
  return Object.hasOwn(FIRST_ECB_DAY, code);
}

export function firstEcbDayOf(pair: { base: string; quote: string }) {
  if (!isSupportedCurrency(pair.base) || !isSupportedCurrency(pair.quote)) {
    return null;
  }
  const base = FIRST_ECB_DAY[pair.base];
  const quote = FIRST_ECB_DAY[pair.quote];
  return base > quote ? base : quote;
}
