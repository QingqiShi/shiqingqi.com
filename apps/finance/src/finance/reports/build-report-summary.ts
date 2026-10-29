import { formatMoney } from "../domain/money/format-money.ts";
import { fillTemplate } from "./fill-template.ts";
import { formatReportWeek } from "./format-report-week.ts";
import type {
  SpendingLine,
  WeeklyReportData,
} from "./weekly-report-data-schema.ts";

/** Translated templates for the text summary; `{name}` marks a value. */
export interface ReportSummaryCopy {
  /** `{week}` */
  title: string;
  /** `{amount}` */
  netWorth: string;
  /** `{amount}` */
  vsLastWeek: string;
  /** `{amount}` */
  sinceYearStart: string;
  /** `{amount}`, `{change}` */
  spent: string;
  noSpending: string;
  /** `{list}` */
  top: string;
  /** Between the top Categories, such as `, ` or `、`. */
  listSeparator: string;
}

const TOP_CATEGORIES = 3;

/** A few lines on the week for a messaging app: net worth, its change, and what was spent. */
export function buildReportSummary(
  data: WeeklyReportData,
  copy: ReportSummaryCopy,
  locale: string,
  categoryName: (line: SpendingLine) => string,
): string {
  const money = (minor: number) =>
    formatMoney(minor, data.baseCurrency, locale);
  const change = (minor: number) =>
    formatMoney(minor, data.baseCurrency, locale, {
      signDisplay: "exceptZero",
    });
  const { comparisons, spending } = data;
  const lines = [
    fillTemplate(copy.title, {
      week: formatReportWeek(data.periodStart, data.periodEnd, locale),
    }),
    fillTemplate(copy.netWorth, {
      amount: money(data.balanceSheet.netWorthMinor),
    }),
    [
      fillTemplate(copy.vsLastWeek, {
        amount: change(comparisons.previousWeek.changeMinor),
      }),
      fillTemplate(copy.sinceYearStart, {
        amount: change(comparisons.yearStart.changeMinor),
      }),
    ].join(" · "),
  ];
  if (spending.totalMinor === 0) {
    lines.push(copy.noSpending);
  } else {
    lines.push(
      fillTemplate(copy.spent, {
        amount: money(spending.totalMinor),
        change: change(spending.changeMinor),
      }),
    );
    const top = spending.byCategory
      .filter((line) => line.amountMinor > 0)
      .slice(0, TOP_CATEGORIES)
      .map((line) => `${categoryName(line)} ${money(line.amountMinor)}`);
    if (top.length > 0) {
      lines.push(
        fillTemplate(copy.top, { list: top.join(copy.listSeparator) }),
      );
    }
  }
  return lines.join("\n");
}
