import { z } from "zod";
import { isValidDay } from "../../domain/dates/to-epoch-day.ts";
import { currencyExponent } from "../../domain/money/currency-exponent.ts";

function isCurrency(code: string) {
  try {
    currencyExponent(code);
    return true;
  } catch {
    return false;
  }
}

const providerId = z.union([z.number(), z.string()]).transform(String);
const currency = z
  .string()
  .transform((code) => code.trim().toUpperCase())
  .refine(isCurrency, "Expected an ISO 4217 code");
const day = z.string().refine(isValidDay, "Expected a YYYY-MM-DD day");

/** Response bodies of the Lunch Flow Personal API, from its OpenAPI spec. Optional fields stay optional. */
export const lunchFlowSchemas = {
  accounts: z.object({
    accounts: z.array(
      z.object({
        id: providerId,
        connection_id: providerId,
        name: z.string(),
        institution_name: z.string(),
        institution_logo: z.string().nullable(),
        provider: z.string(),
        currency: currency.optional(),
        status: z.string().optional(),
      }),
    ),
    total: z.number(),
  }),
  transactions: z.object({
    transactions: z.array(
      z.object({
        id: z.string().nullable(),
        accountId: providerId,
        amount: z.number(),
        currency,
        date: day,
        merchant: z.string().optional(),
        description: z.string().optional(),
        isPending: z.boolean().optional(),
      }),
    ),
    total: z.number(),
  }),
  balance: z.object({
    balance: z.object({ amount: z.number(), currency }),
  }),
  error: z.object({ error: z.string(), message: z.string().optional() }),
};
