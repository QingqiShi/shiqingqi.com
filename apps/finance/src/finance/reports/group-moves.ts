import { sum } from "d3-array";
import { formatMoney } from "../domain/money/format-money.ts";
import type {
  ReportGroup,
  ReportSide,
  WeeklyReportData,
} from "./weekly-report-data-schema.ts";

/** The change of a Group over the week in the base currency: what it added to net worth. */
export function groupChange(group: ReportGroup) {
  return group.totalMinor - group.previousTotalMinor;
}

/** The change of a side over the week. The changes of both sides add up to the change in net worth. */
export function sideChange(side: ReportSide) {
  return sum(side.groups, groupChange);
}

/** A change over the week with its sign, or a dash when there is none. */
export function formatWeekChange(
  minor: number,
  currency: string,
  locale: string,
) {
  return minor === 0
    ? "–"
    : formatMoney(minor, currency, locale, { signDisplay: "exceptZero" });
}

/** How much each Group changed over the week, the largest change first, and the Groups that did not change, in balance-sheet order. */
export function groupMoves(data: WeeklyReportData) {
  const groups = [
    ...data.balanceSheet.assets.groups,
    ...data.balanceSheet.liabilities.groups,
  ].map((group) => ({ group, changeMinor: groupChange(group) }));
  return {
    moved: groups
      .filter((move) => move.changeMinor !== 0)
      .sort((a, b) => Math.abs(b.changeMinor) - Math.abs(a.changeMinor)),
    unchanged: groups
      .filter((move) => move.changeMinor === 0)
      .map((move) => move.group),
  };
}
