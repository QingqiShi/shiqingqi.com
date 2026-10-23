import { z } from "zod";
import { isValidDay } from "../domain/dates/to-epoch-day.ts";
import { wireFields } from "../sync/wire-fields.ts";
import type {
  CurrencyPair,
  ExchangeRateRow,
} from "./exchange-rate-row-schema.ts";

const FRANKFURTER_URL = "https://api.frankfurter.dev/v1";
const TIMEOUT_MS = 15_000;

const seriesSchema = z.object({
  rates: z.record(z.string(), z.record(z.string(), z.number().positive())),
});

/**
 * The rates the European Central Bank published for `pair` from `start` to
 * `end`, through Frankfurter (no key). A day the bank did not publish has no
 * row; when `start` is such a day, the series starts at the day it last
 * published before it. A pair the bank does not publish, or a range after
 * its last rate, gives no rows. Throws when the request fails.
 */
export async function fetchEcbRates(
  request: typeof fetch,
  pair: CurrencyPair,
  start: string,
  end: string,
): Promise<ExchangeRateRow[]> {
  const url = new URL(`${FRANKFURTER_URL}/${start}..${end}`);
  url.searchParams.set("base", pair.base);
  url.searchParams.set("symbols", pair.quote);
  const response = await request(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(
      `Frankfurter answered ${String(response.status)} for ${pair.base}/${pair.quote}`,
    );
  }
  const { rates } = seriesSchema.parse(await response.json());
  const rows: ExchangeRateRow[] = [];
  for (const [on, byCurrency] of Object.entries(rates)) {
    if (!Object.hasOwn(byCurrency, pair.quote)) continue;
    const rate = byCurrency[pair.quote];
    if (!isValidDay(on) || on > end) continue;
    if (!wireFields.fxRate.safeParse(rate).success) continue;
    rows.push({ base: pair.base, quote: pair.quote, on, rate, source: "ecb" });
  }
  return rows;
}
