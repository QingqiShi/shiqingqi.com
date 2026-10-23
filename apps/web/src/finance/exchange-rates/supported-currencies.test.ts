import { describe, expect, it } from "vitest";
import { fetchEcbRates } from "./fetch-ecb-rates.ts";
import {
  firstEcbDayOf,
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
} from "./supported-currencies.ts";

/** Frankfurter's `start_date` for `GET /v1/1999-01-04..?base=EUR&symbols=<code>` on 2026-10-23. */
const FRANKFURTER_START_DATES: Record<string, string> = {
  AUD: "1999-01-04",
  BRL: "2000-01-13",
  CAD: "1999-01-04",
  CHF: "1999-01-04",
  CNY: "2000-01-13",
  CZK: "1999-01-04",
  DKK: "1999-01-04",
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

/** Frankfurter's answer to `GET /v1/latest?base=EUR` on 2026-10-22. */
const EUR_RATES: Record<string, number> = {
  AUD: 1.598,
  BRL: 5.6574,
  CAD: 1.5725,
  CHF: 0.9211,
  CNY: 7.4786,
  CZK: 24.26,
  DKK: 7.4747,
  GBP: 0.8377,
  HKD: 8.7845,
  HUF: 366.43,
  IDR: 20253.88,
  ILS: 3.4824,
  INR: 106.249,
  ISK: 136.2,
  JPY: 175.97,
  KRW: 1484.25,
  MXN: 21.0215,
  MYR: 4.5756,
  NOK: 10.488,
  NZD: 1.9724,
  PHP: 71.162,
  PLN: 4.3695,
  RON: 5.345,
  SEK: 11.112,
  SGD: 1.4315,
  THB: 37.811,
  TRY: 55.6079,
  USD: 1.1205,
  ZAR: 18.5058,
  EUR: 1,
};

function frankfurterAt(day: string): typeof fetch {
  return (input) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const base = url.searchParams.get("base") ?? "";
    const quote = url.searchParams.get("symbols") ?? "";
    return Promise.resolve(
      Response.json({
        amount: 1,
        base,
        start_date: day,
        end_date: day,
        rates: { [day]: { [quote]: EUR_RATES[quote] / EUR_RATES[base] } },
      }),
    );
  };
}

describe("SUPPORTED_CURRENCIES", () => {
  it("is every currency the ECB publishes, EUR included", () => {
    expect([...SUPPORTED_CURRENCIES].sort()).toEqual(
      Object.keys(EUR_RATES).sort(),
    );
    expect(isSupportedCurrency("USD")).toBe(true);
    expect(isSupportedCurrency("AED")).toBe(false);
  });

  it("gives a rate fetchEcbRates keeps for every pair of them", async () => {
    const day = "2026-10-22";
    const request = frankfurterAt(day);
    for (const base of SUPPORTED_CURRENCIES) {
      for (const quote of SUPPORTED_CURRENCIES) {
        if (base === quote) continue;
        const rows = await fetchEcbRates(request, { base, quote }, day, day);
        expect(rows, `${base}/${quote}`).toHaveLength(1);
      }
    }
  });

  it("starts each pair at the later first day of its two currencies", () => {
    for (const [code, start] of Object.entries(FRANKFURTER_START_DATES)) {
      expect(firstEcbDayOf({ base: "EUR", quote: code }), code).toBe(start);
    }
    expect(firstEcbDayOf({ base: "CNY", quote: "GBP" })).toBe("2000-01-13");
    expect(firstEcbDayOf({ base: "GBP", quote: "AED" })).toBeNull();
  });
});
