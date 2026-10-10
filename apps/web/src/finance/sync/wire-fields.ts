import { z } from "zod";
import { isValidDay } from "../domain/dates/to-epoch-day.ts";

const INT32_MAX = 2 ** 31 - 1;

/** PostgreSQL text cannot hold the NUL character. */
function hasNoNul(value: string) {
  return !value.includes("\0");
}

function text(max: number) {
  return z.string().max(max).refine(hasNoNul, "Text cannot hold NUL");
}

/** The zod pieces every Finance wire schema is built from. */
export const wireFields = {
  id: z.uuid(),
  day: z.string().refine(isValidDay, "Expected a YYYY-MM-DD day"),
  minorUnits: z.int(),
  currency: z.string().regex(/^[A-Z]{3}$/, "Expected an ISO 4217 code"),
  timestamp: z.iso.datetime({ offset: true }),
  version: z.int().nonnegative(),
  name: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine(hasNoNul, "Text cannot hold NUL"),
  note: text(2000),
  text,
  position: z
    .int()
    .min(-INT32_MAX - 1)
    .max(INT32_MAX),
  /** Fits `numeric(18, 8)`. */
  fxRate: z.number().min(1e-8).max(1e9),
};
