import { describe, expect, it } from "vitest";
import { computeNetWorthTrend } from "./compute-net-worth-trend.ts";
import { computeWeeklyReport } from "./compute-weekly-report.ts";
import { createReportContext } from "./create-report-context.ts";
import type { ReportSource, ReportSourceAccount } from "./types.ts";

const OPENING_VALUATION_DAY = "2000-01-01";

function account(
  id: string,
  overrides: Partial<ReportSourceAccount> = {},
): ReportSourceAccount {
  return {
    id,
    groupId: "cash",
    ownerMemberId: null,
    name: id,
    institution: "",
    kind: "current",
    currency: "GBP",
    excludedFromNetWorth: false,
    closedOn: null,
    position: 0,
    isSystem: false,
    ...overrides,
  };
}

function source(
  accounts: ReportSourceAccount[],
  balanceDays: ReportSource["balanceDays"],
): ReportSource {
  return {
    baseCurrency: "GBP",
    groups: [{ id: "cash", name: "流动资产", side: "asset", position: 0 }],
    accounts,
    balanceDays,
    exchangeRates: [],
    categories: [],
    payees: [],
    members: [],
    transactions: [],
  };
}

describe("createReportContext firstDay", () => {
  const imported = source(
    [account("current"), account("work", { excludedFromNetWorth: true })],
    [
      { accountId: "current", day: OPENING_VALUATION_DAY, balanceMinor: 0 },
      { accountId: "current", day: "2019-03-06", balanceMinor: 1500_00 },
      { accountId: "current", day: "2019-03-20", balanceMinor: 1600_00 },
      { accountId: "work", day: "2015-05-05", balanceMinor: 50_00 },
    ],
  );

  it("starts at the first balance other than zero, not at a zero opening Valuation", () => {
    expect(createReportContext(imported).firstDay).toBe("2019-03-06");
  });

  it("starts the net-worth trend at the week of the first balance other than zero", () => {
    const trend = computeNetWorthTrend(
      createReportContext(imported),
      "2019-03-24",
    );
    expect(trend.map((point) => [point.day, point.netWorthMinor])).toEqual([
      ["2019-03-10", 1500_00],
      ["2019-03-17", 1500_00],
      ["2019-03-24", 1600_00],
    ]);
  });

  it("keeps a nonzero opening Valuation as the start", () => {
    const context = createReportContext(
      source(
        [account("current")],
        [
          { accountId: "current", day: OPENING_VALUATION_DAY, balanceMinor: 1 },
          { accountId: "current", day: "2019-03-06", balanceMinor: 1500_00 },
        ],
      ),
    );
    expect(context.firstDay).toBe(OPENING_VALUATION_DAY);
  });

  it("is null when no counted Account has a balance other than zero", () => {
    const context = createReportContext(
      source(
        [account("current")],
        [{ accountId: "current", day: OPENING_VALUATION_DAY, balanceMinor: 0 }],
      ),
    );
    expect(context.firstDay).toBeNull();
  });
});

describe("computeWeeklyReport with In transit", () => {
  function reportAt(weekDay: string) {
    const context = createReportContext(
      source(
        [account("current"), account("in-transit", { isSystem: true })],
        [
          { accountId: "current", day: "2026-09-01", balanceMinor: 1000_00 },
          { accountId: "current", day: "2026-09-08", balanceMinor: 500_00 },
          { accountId: "in-transit", day: "2026-09-08", balanceMinor: 500_00 },
          { accountId: "in-transit", day: "2026-09-16", balanceMinor: 0 },
        ],
      ),
    );
    return computeWeeklyReport(context, weekDay);
  }

  it("counts In transit while money is on its way", () => {
    const report = reportAt("2026-09-09");
    expect(report.balanceSheet.assets.groups[0].accounts).toMatchObject([
      { id: "current", baseMinor: 500_00, isSystem: false },
      { id: "in-transit", baseMinor: 500_00, isSystem: true },
    ]);
    expect(report.balanceSheet.netWorthMinor).toBe(1000_00);
  });

  it("leaves In transit out when its balance is zero", () => {
    const report = reportAt("2026-09-23");
    expect(
      report.balanceSheet.assets.groups[0].accounts.map((line) => line.id),
    ).toEqual(["current"]);
  });
});
