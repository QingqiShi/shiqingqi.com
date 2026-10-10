import { and, eq, inArray, sql } from "drizzle-orm";
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
