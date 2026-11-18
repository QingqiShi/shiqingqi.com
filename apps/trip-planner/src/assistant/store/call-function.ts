import { sql, type SQL } from "drizzle-orm";
import type { Transaction } from "#src/trips/as-viewer.ts";

/** The value that a function of the database gives, such as `public.f(…)`. */
export async function callFunction<T>(tx: Transaction, call: SQL): Promise<T> {
  const [{ value }] = await tx
    .select({ value: sql<T>`value` })
    .from(sql`${call} as value`);
  return value;
}

export function jsonb(value: unknown): SQL {
  return value === undefined || value === null
    ? sql`null::jsonb`
    : sql`${JSON.stringify(value)}::jsonb`;
}
