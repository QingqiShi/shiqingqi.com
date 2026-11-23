import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { FundDb } from "#src/db/types.ts";
import {
  fundamentalsSchema,
  type Fundamentals,
} from "../contracts/fundamentals-schema.ts";
import { fundamentals, instruments } from "../fund-schema.ts";

/**
 * The newest snapshot of each symbol fetched on or before `asOf`. When there
 * is none that early, the oldest snapshot: the provider gives only present
 * values, so a replay of a past date reads its future.
 */
export async function getFundamentals(
  db: FundDb,
  symbols: readonly string[],
  { asOf }: { asOf: string },
): Promise<Map<string, Fundamentals>> {
  const bySymbol = new Map<string, Fundamentals>();
  if (symbols.length === 0) return bySymbol;
  const snapshot = alias(fundamentals, "snapshot");
  const isEarly = sql`${snapshot.fetchedOn} <= ${asOf}`;
  const picked = db
    .select({ fetchedOn: snapshot.fetchedOn })
    .from(snapshot)
    .where(eq(snapshot.symbol, instruments.symbol))
    .orderBy(
      sql`${isEarly} desc`,
      sql`case when ${isEarly} then ${snapshot.fetchedOn} end desc nulls last`,
      asc(snapshot.fetchedOn),
    )
    .limit(1)
    .as("picked");
  const rows = await db
    .select({
      symbol: fundamentals.symbol,
      fetchedOn: fundamentals.fetchedOn,
      data: fundamentals.data,
    })
    .from(instruments)
    .crossJoinLateral(picked)
    .innerJoin(
      fundamentals,
      and(
        eq(fundamentals.symbol, instruments.symbol),
        eq(fundamentals.fetchedOn, picked.fetchedOn),
      ),
    )
    .where(inArray(instruments.symbol, symbols));
  for (const { symbol, fetchedOn, data } of rows) {
    const parsed = fundamentalsSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(
        `The fundamentals of ${symbol} fetched on ${fetchedOn} are not valid: ${parsed.error.message}`,
      );
    }
    bySymbol.set(symbol, parsed.data);
  }
  return bySymbol;
}
