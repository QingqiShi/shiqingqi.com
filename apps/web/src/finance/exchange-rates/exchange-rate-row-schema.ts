import { z } from "zod";
import { wireFields } from "../sync/wire-fields.ts";

const { currency, day } = wireFields;

/** `household`: copied from a Household's own rates; `ecb`: published by the European Central Bank. */
export const exchangeRateSourceSchema = z.enum(["household", "ecb"]);

export type ExchangeRateSource = z.infer<typeof exchangeRateSourceSchema>;

/** One exchange rate: one unit of `base` is worth `rate` units of `quote` on `on`. */
export const exchangeRateRowSchema = z.object({
  base: currency,
  quote: currency,
  on: day,
  rate: z.number().positive(),
  source: exchangeRateSourceSchema,
});

export type ExchangeRateRow = z.infer<typeof exchangeRateRowSchema>;

export const exchangeRatesResponseSchema = z.object({
  cursor: z.string(),
  /** True: the rates replace the rates on the device. False: they add to them. */
  replace: z.boolean(),
  rates: z.array(exchangeRateRowSchema),
});

export type ExchangeRatesResponse = z.infer<typeof exchangeRatesResponseSchema>;

export function exchangeRateKey(
  rate: Pick<ExchangeRateRow, "base" | "quote" | "on">,
) {
  return `${rate.base}|${rate.quote}|${rate.on}`;
}

/** A pair of currencies a Household needs a rate for: from `base`, a currency an account uses, to `quote`, the Household's Base currency. */
export interface CurrencyPair {
  base: string;
  quote: string;
}
