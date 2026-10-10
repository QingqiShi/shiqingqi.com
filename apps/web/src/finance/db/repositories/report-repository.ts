import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { reports } from "../schema.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

interface NewReport {
  id: string;
  periodStart: string;
  periodEnd: string;
  data: unknown;
}

export const reportRepository = {
  async findById(scope: RepositoryScope, id: string) {
    const rows = await scope.db
      .select()
      .from(reports)
      .where(
        and(eq(reports.householdId, scope.householdId), eq(reports.id, id)),
      );
    return rows.at(0);
  },

  /** Every Report without its data, newest week first. */
  async list(scope: RepositoryScope) {
    return scope.db
      .select({
        id: reports.id,
        periodStart: reports.periodStart,
        periodEnd: reports.periodEnd,
        generatedAt: reports.generatedAt,
      })
      .from(reports)
      .where(eq(reports.householdId, scope.householdId))
      .orderBy(desc(reports.periodEnd));
  },

  /** Deletes one Report. False when the Household has no Report with this id. */
  async remove(scope: RepositoryScope, id: string) {
    const removed = await scope.db
      .delete(reports)
      .where(
        and(eq(reports.householdId, scope.householdId), eq(reports.id, id)),
      )
      .returning({ id: reports.id });
    return removed.length > 0;
  },

  /** Deletes the Reports of the weeks that end before `periodEnd`, and says how many. */
  async removeBefore(scope: RepositoryScope, periodEnd: string) {
    const removed = await scope.db
      .delete(reports)
      .where(
        and(
          eq(reports.householdId, scope.householdId),
          lt(reports.periodEnd, periodEnd),
        ),
      )
      .returning({ id: reports.id });
    return removed.length;
  },

  /** The stored data of the Reports that end on `periodEnds`, by period end. */
  async listDataByPeriodEnd(scope: RepositoryScope, periodEnds: string[]) {
    if (periodEnds.length === 0) return new Map<string, unknown>();
    const rows = await scope.db
      .select({ periodEnd: reports.periodEnd, data: reports.data })
      .from(reports)
      .where(
        and(
          eq(reports.householdId, scope.householdId),
          inArray(reports.periodEnd, periodEnds),
        ),
      );
    return new Map(rows.map((row) => [row.periodEnd, row.data]));
  },

  /** Inserts the Reports, or replaces the data of the ones with the same period end. */
  async upsert(scope: WriteScope, rows: readonly NewReport[]) {
    if (rows.length === 0) return;
    await scope.db
      .insert(reports)
      .values(
        rows.map((row) => ({
          ...row,
          householdId: scope.householdId,
          version: scope.version,
        })),
      )
      .onConflictDoUpdate({
        target: [reports.householdId, reports.periodEnd],
        set: {
          periodStart: sql`excluded.period_start`,
          data: sql`excluded.data`,
          generatedAt: sql`now()`,
          version: scope.version,
        },
      });
  },
};
