import { isDeepStrictEqual } from "node:util";
import { reportRepository } from "../db/repositories/report-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { nameBasedUuid } from "../ids/name-based-uuid.ts";
import { runServerWrite } from "../sync/run-server-write.ts";
import { computeNetWorthTrend } from "./compute-net-worth-trend.ts";
import { computeWeeklyReport } from "./compute-weekly-report.ts";
import { createReportContext } from "./create-report-context.ts";
import { lastCompleteWeekEnd } from "./last-complete-week-end.ts";
import { loadReportSource } from "./load-report-source.ts";
import { reportWeekOf } from "./report-week-of.ts";
import { weekEndsBetween } from "./week-ends-between.ts";
import { weeklyReportDataSchema } from "./weekly-report-data-schema.ts";

const UPSERT_CHUNK = 50;

/** Days of Transactions before a Report week that its averages read. */
const REPORT_LOOKBACK_DAYS = 28;

interface GeneratedReports {
  /** The Reports of the weeks asked for, oldest first. */
  reports: { id: string; periodEnd: string }[];
  written: number;
  unchanged: number;
  /** The Household clock after the write. */
  clock: number;
}

/** The id of a Household's Report for the week that ends on `periodEnd`. */
function reportId(householdId: string, periodEnd: string) {
  return nameBasedUuid(`report:${householdId}:${periodEnd}`);
}

/**
 * Builds and stores the weekly Reports of the weeks that hold `weekDays`,
 * of every complete week since the first balance other than zero ("all"),
 * or of the last complete week in the Household's time zone ("last"). Weeks
 * that have not ended yet are skipped. A Report whose data did not change
 * is not written again, so running twice writes nothing and the clock stays.
 */
export async function generateWeeklyReports(
  db: FinanceDb,
  householdId: string,
  now: Date,
  weekDays: readonly string[] | "all" | "last",
): Promise<GeneratedReports> {
  const { result, clock } = await runServerWrite(
    db,
    householdId,
    now,
    async (context) => {
      const lastWeekEnd = lastCompleteWeekEnd(context.today);
      const days = weekDays === "last" ? [lastWeekEnd] : weekDays;
      const requested =
        days === "all"
          ? null
          : [...new Set(days.map((day) => reportWeekOf(day).periodEnd))]
              .filter((day) => day <= lastWeekEnd)
              .sort();
      if (requested?.length === 0) {
        return { reports: [], written: 0, unchanged: 0 };
      }
      const source = await loadReportSource(context.scope, {
        transactionsFrom: requested
          ? addDays(requested[0], -6 - REPORT_LOOKBACK_DAYS)
          : null,
        to: requested?.at(-1) ?? lastWeekEnd,
      });
      const reportContext = createReportContext(source);
      const weekEnds =
        requested ??
        (reportContext.firstDay === null
          ? []
          : weekEndsBetween(reportContext.firstDay, lastWeekEnd));
      const lastReportEnd = weekEnds.at(-1);
      if (lastReportEnd === undefined) {
        return { reports: [], written: 0, unchanged: 0 };
      }

      const trend = computeNetWorthTrend(reportContext, lastReportEnd);
      const stored = await reportRepository.listDataByPeriodEnd(
        context.scope,
        weekEnds,
      );
      const changed = [];
      for (const periodEnd of weekEnds) {
        const data = weeklyReportDataSchema.parse(
          computeWeeklyReport(reportContext, periodEnd, trend),
        );
        if (isDeepStrictEqual(stored.get(periodEnd), data)) continue;
        changed.push({
          id: reportId(householdId, periodEnd),
          periodStart: data.periodStart,
          periodEnd,
          data,
        });
      }
      for (let i = 0; i < changed.length; i += UPSERT_CHUNK) {
        await reportRepository.upsert(
          context.scope,
          changed.slice(i, i + UPSERT_CHUNK),
        );
      }
      if (changed.length > 0) context.markWritten();
      return {
        reports: weekEnds.map((periodEnd) => ({
          id: reportId(householdId, periodEnd),
          periodEnd,
        })),
        written: changed.length,
        unchanged: weekEnds.length - changed.length,
      };
    },
  );
  return { ...result, clock };
}
