import { describe, expect, it } from "vitest";
import { categoryLineName } from "../store/category-display-name.ts";
import { adjacentReports } from "./adjacent-reports.ts";
import { assetLiabilitySplit } from "./asset-liability-split.ts";
import { buildReportImage } from "./build-report-image.tsx";
import {
  buildReportSummary,
  type ReportSummaryCopy,
} from "./build-report-summary.ts";
import { collectElementText } from "./collect-element-text.ts";
import { fillTemplate } from "./fill-template.ts";
import { formatReportWeek } from "./format-report-week.ts";
import { groupReportsByYear } from "./group-reports-by-year.ts";
import { layoutBars } from "./layout-bars.ts";
import type { ReportListItem } from "./report-api-schemas.ts";
import { reportChartSeries } from "./report-chart-series.ts";
import { reportGroupBars } from "./report-group-bars.ts";
import {
  WEEKLY_REPORT_SCHEMA_VERSION,
  type SpendingLine,
  type WeeklyReportData,
} from "./weekly-report-data-schema.ts";

/** Intl puts thin spaces around a range dash; compare with plain ones. */
function plain(text: string) {
  return text.replace(/[\u2009\u202f]/g, " ");
}

function reportRow(periodEnd: string, periodStart = periodEnd): ReportListItem {
  return { id: `report-${periodEnd}`, periodStart, periodEnd };
}

const comparison = (changeMinor: number) => ({
  day: "2026-09-27",
  netWorthMinor: 100_000_00 - changeMinor,
  changeMinor,
});

const spendingLine = (
  id: string | null,
  name: string,
  amountMinor: number,
  isSystem = false,
) => ({
  id,
  name,
  isSystem,
  amountMinor,
  averageMinor: 0,
  changeMinor: amountMinor,
});

const data: WeeklyReportData = {
  schemaVersion: WEEKLY_REPORT_SCHEMA_VERSION,
  periodStart: "2026-09-28",
  periodEnd: "2026-10-04",
  baseCurrency: "GBP",
  balanceSheet: {
    assets: { totalMinor: 120_000_00, groups: [] },
    liabilities: { totalMinor: -20_000_00, groups: [] },
    netWorthMinor: 100_000_00,
  },
  comparisons: {
    previousWeek: comparison(1_250_50),
    fourWeeksAgo: comparison(-300_00),
    yearStart: comparison(9_000_00),
  },
  groupNets: [],
  propertyNetMinor: null,
  spending: {
    totalMinor: 412_30,
    averageMinor: 380_00,
    changeMinor: 32_30,
    byCategory: [
      spendingLine("food", "Food", 200_00),
      spendingLine(null, "", 100_00),
      spendingLine("transport", "Transport", 80_00),
      spendingLine("home", "Home", 32_30),
      spendingLine("refunds", "Shopping", -10_00),
    ],
    byMember: [],
  },
  incomeMinor: 0,
  topPayees: [],
  transactionCount: 12,
  reviewCount: 2,
  trend: [
    {
      day: "2026-09-20",
      netWorthMinor: 90_000_00,
      averageMinor: 89_000_00,
      propertyNetMinor: null,
    },
    {
      day: "2026-09-27",
      netWorthMinor: 98_749_50,
      averageMinor: 90_000_00,
      propertyNetMinor: 50_000_00,
    },
    {
      day: "2026-10-04",
      netWorthMinor: 100_000_00,
      averageMinor: 91_000_00,
      propertyNetMinor: 51_000_00,
    },
  ],
};

const copy: ReportSummaryCopy = {
  title: "Weekly report, {week}",
  netWorth: "Net worth {amount}",
  vsLastWeek: "{amount} vs last week",
  sinceYearStart: "{amount} since 1 Jan",
  spent: "Spent {amount} ({change} vs 4-week average)",
  noSpending: "Nothing spent this week",
  top: "Most on: {list}",
  listSeparator: ", ",
};

const lineName = (line: SpendingLine) =>
  categoryLineName(line, { uncategorised: "Uncategorised" });

describe("report list helpers", () => {
  const newestFirst = [
    reportRow("2026-01-04"),
    reportRow("2025-12-28"),
    reportRow("2025-12-21"),
  ];

  it("splits the list by the year each week ends in", () => {
    expect(
      groupReportsByYear(newestFirst).map(({ year, reports }) => [
        year,
        reports.map((report) => report.periodEnd),
      ]),
    ).toEqual([
      ["2026", ["2026-01-04"]],
      ["2025", ["2025-12-28", "2025-12-21"]],
    ]);
  });

  it("finds the week before and after, and nothing past either end", () => {
    expect(adjacentReports(newestFirst, "report-2025-12-28")).toEqual({
      older: newestFirst[2],
      newer: newestFirst[0],
    });
    expect(adjacentReports(newestFirst, "report-2026-01-04").newer).toBeNull();
    expect(adjacentReports(newestFirst, "report-2025-12-21").older).toBeNull();
    expect(adjacentReports(newestFirst, "missing")).toEqual({
      older: null,
      newer: null,
    });
  });

  it("formats a week across a year end in both languages", () => {
    expect(plain(formatReportWeek("2025-12-29", "2026-01-04", "en"))).toBe(
      "29 Dec 2025 – 4 Jan 2026",
    );
    expect(formatReportWeek("2026-09-28", "2026-10-04", "zh")).toMatch(
      /^2026年9月28日 – 10月4日$/,
    );
  });
});

describe("report charts", () => {
  it("plots net worth with its moving average", () => {
    const series = reportChartSeries(data.trend, "netWorth");
    expect(series?.values).toEqual(
      Float64Array.from([90_000_00, 98_749_50, 100_000_00]),
    );
    expect(series?.trend).toEqual(
      Float64Array.from([89_000_00, 90_000_00, 91_000_00]),
    );
    const days = Array.from(series?.days ?? []);
    expect(days.slice(1).map((day, index) => day - days[index])).toEqual([
      7, 7,
    ]);
  });

  it("plots the property net only from its first week", () => {
    const series = reportChartSeries(data.trend, "propertyNet");
    expect(series?.values).toEqual(Float64Array.from([50_000_00, 51_000_00]));
    expect(series?.trend).toBeNull();
    expect(
      reportChartSeries(
        data.trend.map((point) => ({ ...point, propertyNetMinor: null })),
        "propertyNet",
      ),
    ).toBeNull();
  });

  it("grows negative bars from the zero line towards the start", () => {
    const { zero, bars } = layoutBars([300, -100, 0]);
    expect(zero).toBeCloseTo(0.25);
    expect(bars[0]).toEqual({ offset: 0.25, size: 0.75 });
    expect(bars[1].offset).toBeCloseTo(0);
    expect(bars[1].size).toBeCloseTo(0.25);
    expect(bars[2].size).toBe(0);
    expect(layoutBars([0, 0]).bars).toEqual([
      { offset: 0, size: 0 },
      { offset: 0, size: 0 },
    ]);
  });

  it("draws each Group at its balance-sheet total, a liability after its asset Group", () => {
    const group = (id: string, name: string, totalMinor: number) => ({
      id,
      name,
      totalMinor,
      accounts: [],
    });
    const bars = reportGroupBars({
      ...data,
      balanceSheet: {
        assets: {
          totalMinor: 0,
          groups: [
            group("cash", "Cash", 10_000_00),
            group("home", "Home", 500_000_00),
          ],
        },
        liabilities: {
          totalMinor: 0,
          groups: [
            group("card", "Card", -500_00),
            group("home-loan", "Home loan", -250_000_00),
          ],
        },
        netWorthMinor: 0,
      },
      groupNets: [
        { name: "Cash", groupIds: ["cash"], valueMinor: 10_000_00 },
        {
          name: "Home",
          groupIds: ["home", "home-loan"],
          valueMinor: 250_000_00,
        },
        { name: "Card", groupIds: ["card"], valueMinor: -500_00 },
      ],
    });
    expect(bars).toEqual([
      { id: "cash", name: "Cash", valueMinor: 10_000_00 },
      { id: "home", name: "Home", valueMinor: 500_000_00 },
      { id: "home-loan", name: "Home loan", valueMinor: -250_000_00 },
      { id: "card", name: "Card", valueMinor: -500_00 },
    ]);
  });

  it("splits assets against what is owed", () => {
    expect(assetLiabilitySplit(data.balanceSheet)).toEqual({
      assetsMinor: 120_000_00,
      liabilitiesMinor: 20_000_00,
      assetShare: 120 / 140,
      liabilityShare: 1 - 120 / 140,
    });
    const empty = assetLiabilitySplit({
      assets: { totalMinor: 0, groups: [] },
      liabilities: { totalMinor: 0, groups: [] },
      netWorthMinor: 0,
    });
    expect([empty.assetShare, empty.liabilityShare]).toEqual([0, 0]);
  });
});

describe("text summary", () => {
  it("fills named values and leaves unknown ones", () => {
    expect(fillTemplate("{a} and {b}", { a: "1" })).toBe("1 and {b}");
  });

  it("names net worth, its change, the spending and the top three categories", () => {
    expect(
      plain(buildReportSummary(data, copy, "en", lineName)).split("\n"),
    ).toEqual([
      "Weekly report, 28 Sept – 4 Oct 2026",
      "Net worth £100,000.00",
      "+£1,250.50 vs last week · +£9,000.00 since 1 Jan",
      "Spent £412.30 (+£32.30 vs 4-week average)",
      "Most on: Food £200.00, Uncategorised £100.00, Transport £80.00",
    ]);
  });

  it("names a Category line the way the caller asks", () => {
    const summary = buildReportSummary(data, copy, "zh", (line) =>
      line.id === null ? "未分类" : line.name,
    );
    expect(summary.split("\n").at(-1)).toContain("未分类");
    expect(summary).not.toContain("Uncategorised");
  });

  it("says so when nothing was spent", () => {
    const quiet = {
      ...data,
      spending: { ...data.spending, totalMinor: 0, byCategory: [] },
    };
    expect(
      buildReportSummary(quiet, copy, "en", lineName).split("\n").at(-1),
    ).toBe("Nothing spent this week");
  });
});

describe("share image", () => {
  it("names a system Category line in the image's language", () => {
    const withSystemLine: WeeklyReportData = {
      ...data,
      spending: {
        ...data.spending,
        byCategory: [
          spendingLine("food", "Food", 200_00),
          spendingLine("uncategorised", "Uncategorised", 100_00, true),
        ],
      },
    };
    const zh = collectElementText(
      buildReportImage(withSystemLine, { locale: "zh", includeNames: false }),
    );
    expect(zh).toContain("未分类");
    expect(zh).not.toContain("Uncategorised");
    expect(
      collectElementText(
        buildReportImage(withSystemLine, { locale: "en", includeNames: false }),
      ),
    ).toContain("Uncategorised");
  });
});
