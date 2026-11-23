import { asc, eq } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import { instruments } from "../fund-schema.ts";
import type { Instrument } from "../types.ts";

/** Every instrument, or those of one kind, by symbol. Inactive stocks are included: the fund may still hold one. */
export async function getInstruments(
  db: FundDb,
  { kind }: { kind?: Instrument["kind"] } = {},
): Promise<Instrument[]> {
  return db
    .select()
    .from(instruments)
    .where(kind ? eq(instruments.kind, kind) : undefined)
    .orderBy(asc(instruments.symbol));
}
