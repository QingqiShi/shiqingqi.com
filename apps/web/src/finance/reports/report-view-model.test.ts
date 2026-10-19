import { describe, expect, it } from "vitest";
import { categoryLineName } from "../store/category-display-name.ts";
import { adjacentReports } from "./adjacent-reports.ts";
import { assetLiabilitySplit } from "./asset-liability-split.ts";
import {
  buildReportImageDrawing,
  type MeasureText,
  type ReportImageOptions,
} from "./build-report-image-drawing.ts";
import {
  buildReportSummary,
  type ReportSummaryCopy,
} from "./build-report-summary.ts";
import { fillTemplate } from "./fill-template.ts";
import { formatReportWeek } from "./format-report-week.ts";
import { groupMoves } from "./group-moves.ts";
import { groupReportsByYear } from "./group-reports-by-year.ts";
import { layoutBars } from "./layout-bars.ts";
import type { ReportListItem } from "./report-api-schemas.ts";
import { reportChartSeries } from "./report-chart-series.ts";
import {
  IMAGE_GROUP_HEIGHT,
  IMAGE_GROUP_ROW_GAP,
  reportImageLayout,
} from "./report-image-layout.ts";
import type { ReportImageCopy } from "./use-report-image-copy.ts";
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
  return {
    id: `report-${periodEnd}`,
    periodStart,
    periodEnd,
    generatedAt: `${periodEnd}T06:00:00.000Z`,
  };
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
    history: [
      { periodEnd: "2026-09-20", totalMinor: 350_00 },
      { periodEnd: "2026-09-27", totalMinor: 410_00 },
      { periodEnd: "2026-10-04", totalMinor: 412_30 },
    ],
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
  it("plots net worth week by week", () => {
    const series = reportChartSeries(data.trend, "netWorth");
    expect(series?.values).toEqual(
      Float64Array.from([90_000_00, 98_749_50, 100_000_00]),
    );
    const days = Array.from(series?.days ?? []);
    expect(days.slice(1).map((day, index) => day - days[index])).toEqual([
      7, 7,
    ]);
  });

  it("plots the property net only from its first week", () => {
    const series = reportChartSeries(data.trend, "propertyNet");
    expect(series?.values).toEqual(Float64Array.from([50_000_00, 51_000_00]));
    expect(
      reportChartSeries(
        data.trend.map((point) => ({ ...point, propertyNetMinor: null })),
        "propertyNet",
      ),
    ).toBeNull();
  });

  it("ranks what moved by the size of the change, apart from what did not", () => {
    const account = (
      id: string,
      baseMinor: number,
      previousBaseMinor: number,
    ) => ({
      id,
      name: id,
      institution: "",
      kind: "current",
      currency: "GBP",
      ownerName: null,
      balanceMinor: baseMinor,
      baseMinor,
      previousBaseMinor,
      isSystem: false,
    });
    const group = (id: string, accounts: ReturnType<typeof account>[]) => ({
      id,
      name: id,
      totalMinor: accounts.reduce((sum, item) => sum + item.baseMinor, 0),
      previousTotalMinor: accounts.reduce(
        (sum, item) => sum + item.previousBaseMinor,
        0,
      ),
      history: [],
      accounts,
    });
    const moving: WeeklyReportData = {
      ...data,
      balanceSheet: {
        assets: {
          totalMinor: 0,
          groups: [
            group("cash", [
              account("current", 4_000_00, 5_500_00),
              account("savings", 6_000_00, 5_500_00),
            ]),
            group("invest", [account("isa", 50_000_00, 49_800_00)]),
            group("home", [account("house", 500_000_00, 500_000_00)]),
          ],
        },
        liabilities: {
          totalMinor: 0,
          groups: [group("card", [account("visa", -500_00, -800_00)])],
        },
        netWorthMinor: 0,
      },
    };
    const groups = groupMoves(moving);
    expect(
      groups.moved.map((move) => [move.group.id, move.changeMinor]),
    ).toEqual([
      ["cash", -1_000_00],
      ["card", 300_00],
      ["invest", 200_00],
    ]);
    expect(groups.unchanged.map((item) => item.id)).toEqual(["home"]);
  });

  it("lays bars either side of a shared zero", () => {
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
  const copy: ReportImageCopy = {
    title: "Weekly report",
    netWorth: "Net worth",
    thisWeek: "This week",
    sinceYearStart: "Since 1 Jan",
    byGroup: "By group",
    groupChange: "{change} this week",
    noChange: "No change this week",
    owed: "{amount} owed",
    owedMore: "{amount} more",
    owedLess: "{amount} less",
    spentThisWeek: "Spent this week",
    aboveAverage: "{amount} above the 4-week average",
    belowAverage: "{amount} below the 4-week average",
    atAverage: "The same as the 4-week average",
    fourWeekAverage: "4-week average",
    byCategory: "By category",
    noSpending: "Nothing spent this week",
    uncategorised: "Uncategorised",
  };
  /** Every character as wide as half the font size, like a narrow sans-serif. */
  const measureText: MeasureText = (text, font) =>
    Array.from(text).length * font.size * 0.5;

  function drawnText(
    report: WeeklyReportData,
    options: ReportImageOptions,
    imageCopy = copy,
  ) {
    return buildReportImageDrawing(report, {
      ...options,
      copy: imageCopy,
      measureText,
    }).commands.flatMap((command) =>
      command.kind === "text" ? [command.text] : [],
    );
  }

  const account = (id: string, name: string, baseMinor: number) => ({
    id,
    name,
    institution: "Example Bank",
    kind: "current",
    currency: "GBP",
    ownerName: "Alex",
    balanceMinor: baseMinor,
    baseMinor,
    previousBaseMinor: baseMinor,
    isSystem: false,
  });
  const withGroups: WeeklyReportData = {
    ...data,
    balanceSheet: {
      ...data.balanceSheet,
      assets: {
        totalMinor: 120_000_00,
        groups: [
          {
            id: "cash",
            name: "Cash",
            totalMinor: 120_000_00,
            previousTotalMinor: 119_000_00,
            history: [118_000_00, 119_000_00, 120_000_00],
            accounts: [
              account("joint", "Joint current account", 20_000_00),
              account("isa", "Stocks and shares ISA", 100_000_00),
            ],
          },
          {
            id: "other",
            name: "Other",
            totalMinor: 0,
            previousTotalMinor: 0,
            history: [0, 0, 0],
            accounts: [account("loan", "Lent to a friend", 0)],
          },
        ],
      },
      liabilities: {
        totalMinor: -20_000_00,
        groups: [
          {
            id: "cards",
            name: "Cards",
            totalMinor: -20_000_00,
            previousTotalMinor: -18_500_00,
            history: [-19_000_00, -18_500_00, -20_000_00],
            accounts: [account("visa", "Visa", -20_000_00)],
          },
        ],
      },
    },
  };

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
    const zh = drawnText(
      withSystemLine,
      { locale: "zh" },
      { ...copy, uncategorised: "未分类" },
    );
    expect(zh).toContain("未分类");
    expect(zh).not.toContain("Uncategorised");
    expect(drawnText(withSystemLine, { locale: "en" })).toContain(
      "Uncategorised",
    );
  });

  it("says so when nothing was spent", () => {
    const quiet: WeeklyReportData = {
      ...data,
      spending: { ...data.spending, byCategory: [], history: [] },
      trend: [],
    };
    expect(drawnText(quiet, { locale: "en" })).toContain(
      "Nothing spent this week",
    );
  });

  it("shows each Group's balance and change, and no Account", () => {
    const drawn = drawnText(withGroups, { locale: "en" });
    expect(drawn).toContain("Cash");
    expect(drawn).toContain("£120,000.00");
    expect(drawn).toContain("+£1,000.00");
    expect(drawn.join("\n")).not.toMatch(/Joint|ISA|Visa|Alex|Example/);
  });

  it("shows what a liability Group owes and whether it owes more", () => {
    const drawn = drawnText(withGroups, { locale: "en" });
    expect(drawn).toContain("£20,000.00");
    expect(drawn).toContain(" owed");
    expect(drawn).toContain("£1,500.00 more");
  });

  it("leaves out a Group that never had a balance", () => {
    expect(drawnText(withGroups, { locale: "en" })).not.toContain("Other");
  });

  it("keeps every command inside the image", () => {
    const drawing = buildReportImageDrawing(withGroups, {
      locale: "zh",
      copy,
      measureText,
    });
    for (const command of drawing.commands) {
      const right =
        command.kind === "rect" ? command.x + command.width : command.x;
      expect(command.x).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(drawing.width);
      expect(command.y).toBeGreaterThanOrEqual(0);
      expect(command.y).toBeLessThanOrEqual(drawing.height);
    }
  });
});

describe("share image layout", () => {
  it("grows by a row of Groups for every three Groups", () => {
    const base = { hasTrend: true, categories: 6 };
    const three = reportImageLayout({ ...base, groups: 3 });
    const four = reportImageLayout({ ...base, groups: 4 });
    const six = reportImageLayout({ ...base, groups: 6 });
    expect(four.height - three.height).toBe(
      IMAGE_GROUP_HEIGHT + IMAGE_GROUP_ROW_GAP,
    );
    expect(six.height).toBe(four.height);
  });

  it("leaves out the trend and the Groups when there are none", () => {
    const bare = reportImageLayout({
      hasTrend: false,
      groups: 0,
      categories: 0,
    });
    expect(bare.trendTop).toBeNull();
    expect(bare.groupsTop).toBeNull();
    expect(bare.spendingTop).toBeLessThan(bare.height);
  });
});
