import { and, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import "server-only";
import type { FundDb } from "#src/db/types.ts";
import { journalEntries, runSteps, runs } from "../fund-schema.ts";
import { formatDay, parseDay } from "../ledger/add-days.ts";
import type { Instrument, JournalEntry, Run } from "../types.ts";

export type JournalEntryView = Pick<
  JournalEntry,
  "id" | "runId" | "date" | "symbol" | "kind" | "summary" | "rationale"
> & { name: string | null };

export type RunListItem = Pick<Run, "id" | "kind" | "asOf" | "status"> & {
  costUsd: number;
};

export interface JournalView {
  /** Newest first. */
  entries: JournalEntryView[];
  /** Newest first. */
  runs: RunListItem[];
  /** The `before` of this page, or null on the newest page. */
  before: string | null;
  /** The `before` of the next page back, or null when nothing is older. */
  earlier: string | null;
}

/** The days with an entry or a meeting on one page of the journal. */
const PAGE_DAYS = 30;

/** `value` when it is a real `YYYY-MM-DD` date, else null. */
function validDay(value: string | undefined): string | null {
  if (value === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return formatDay(parseDay(value)) === value ? value : null;
}

/**
 * One page of the trade journal and the meetings, each meeting with what it
 * cost: the newest 30 days with an entry or a meeting before `requested`.
 * A `requested` that is not a date is ignored.
 */
export async function loadJournal(
  db: FundDb,
  instruments: readonly Instrument[],
  requested: string | undefined,
): Promise<JournalView> {
  const before = validDay(requested);
  const [entryDays, runDays] = await Promise.all([
    db
      .selectDistinct({ day: journalEntries.date })
      .from(journalEntries)
      .where(before === null ? undefined : lt(journalEntries.date, before))
      .orderBy(desc(journalEntries.date))
      .limit(PAGE_DAYS + 1),
    db
      .selectDistinct({ day: runs.asOf })
      .from(runs)
      .where(before === null ? undefined : lt(runs.asOf, before))
      .orderBy(desc(runs.asOf))
      .limit(PAGE_DAYS + 1),
  ]);
  const days = [...new Set([...entryDays, ...runDays].map((row) => row.day))]
    .sort()
    .reverse();
  const from = days.at(Math.min(days.length, PAGE_DAYS) - 1);
  const inPage = (column: PgColumn): SQL | undefined =>
    and(
      from === undefined ? undefined : gte(column, from),
      before === null ? undefined : lt(column, before),
    );

  const [entryRows, runRows, costRows] = await Promise.all([
    db
      .select()
      .from(journalEntries)
      .where(inPage(journalEntries.date))
      .orderBy(desc(journalEntries.date), desc(journalEntries.createdAt)),
    db
      .select({
        id: runs.id,
        kind: runs.kind,
        asOf: runs.asOf,
        status: runs.status,
      })
      .from(runs)
      .where(inPage(runs.asOf))
      .orderBy(desc(runs.asOf), desc(runs.createdAt)),
    db
      .select({
        runId: runSteps.runId,
        costUsd: sql<
          number | null
        >`sum((${runSteps.usage}->>'costUsd')::float8)`,
      })
      .from(runSteps)
      .innerJoin(runs, eq(runs.id, runSteps.runId))
      .where(inPage(runs.asOf))
      .groupBy(runSteps.runId),
  ]);
  const costs = new Map(costRows.map((row) => [row.runId, row.costUsd ?? 0]));
  const names = new Map(
    instruments.map((instrument) => [instrument.symbol, instrument.name]),
  );
  return {
    entries: entryRows.map((entry) => ({
      id: entry.id,
      runId: entry.runId,
      date: entry.date,
      symbol: entry.symbol,
      kind: entry.kind,
      summary: entry.summary,
      rationale: entry.rationale,
      name: entry.symbol === null ? null : (names.get(entry.symbol) ?? null),
    })),
    runs: runRows.map((run) => ({
      ...run,
      costUsd: costs.get(run.id) ?? 0,
    })),
    before,
    earlier: days.length > PAGE_DAYS && from !== undefined ? from : null,
  };
}
