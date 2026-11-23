import { and, asc, count, desc, eq, inArray, lte } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import { instruments, journalEntries } from "../fund-schema.ts";
import type { JournalEntry } from "../types.ts";

const RECENT_JOURNAL = 25;
const SYMBOL_JOURNAL = 10;

const newestFirst = [
  desc(journalEntries.date),
  desc(journalEntries.createdAt),
  desc(journalEntries.id),
];

/** The newest `limit` entries dated on or before `asOf`, oldest first. */
async function newest(
  db: FundDb,
  asOf: string,
  limit: number,
): Promise<JournalEntry[]> {
  const rows = await db
    .select()
    .from(journalEntries)
    .where(lte(journalEntries.date, asOf))
    .orderBy(...newestFirst)
    .limit(limit);
  return rows.reverse();
}

/** The newest `limit` entries of each symbol dated on or before `asOf`, oldest first. */
async function newestOfSymbols(
  db: FundDb,
  asOf: string,
  symbols: readonly string[],
  limit: number,
): Promise<Map<string, JournalEntry[]>> {
  const bySymbol = new Map<string, JournalEntry[]>(
    symbols.map((symbol) => [symbol, []]),
  );
  if (symbols.length === 0) return bySymbol;
  const entry = db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.symbol, instruments.symbol),
        lte(journalEntries.date, asOf),
      ),
    )
    .orderBy(...newestFirst)
    .limit(limit)
    .as("entry");
  const rows = await db
    .select({
      id: entry.id,
      runId: entry.runId,
      date: entry.date,
      symbol: entry.symbol,
      kind: entry.kind,
      summary: entry.summary,
      rationale: entry.rationale,
      orderId: entry.orderId,
      createdAt: entry.createdAt,
    })
    .from(instruments)
    .crossJoinLateral(entry)
    .where(inArray(instruments.symbol, symbols))
    .orderBy(asc(entry.date), asc(entry.createdAt), asc(entry.id));
  for (const row of rows) {
    if (row.symbol !== null) bySymbol.get(row.symbol)?.push(row);
  }
  return bySymbol;
}

/** What the PM's pack shows of the journal. */
async function forPm(db: FundDb, asOf: string, symbols: readonly string[]) {
  const [{ total }] = await db
    .select({ total: count() })
    .from(journalEntries)
    .where(lte(journalEntries.date, asOf));
  const recent = await newest(db, asOf, RECENT_JOURNAL);
  const shown = new Set(recent.map((e) => e.id));
  // A symbol's entries among the recent ones are its newest, so this many
  // per symbol always holds its newest older ones.
  const ofSymbols = await newestOfSymbols(
    db,
    asOf,
    symbols,
    RECENT_JOURNAL + SYMBOL_JOURNAL,
  );
  const olderBySymbol = new Map(
    [...ofSymbols].map(([symbol, entries]) => [
      symbol,
      entries.filter((e) => !shown.has(e.id)).slice(-SYMBOL_JOURNAL),
    ]),
  );
  return { total, recent, olderBySymbol };
}

export type PmJournal = Awaited<ReturnType<typeof forPm>>;

/** The journal queries of the meeting, each limited to what one pack shows. */
export const journalReads = { newestOfSymbols, forPm };
