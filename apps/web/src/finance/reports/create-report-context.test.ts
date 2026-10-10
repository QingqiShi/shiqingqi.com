import { describe, expect, it } from "vitest";
import { SINCE_THE_START_DAY } from "../import/moneythings/map-valuations.ts";
import { computeNetWorthTrend } from "./compute-net-worth-trend.ts";
import { createReportContext } from "./create-report-context.ts";
import type { ReportSource, ReportSourceAccount } from "./types.ts";

function account(
  id: string,
  overrides: Partial<ReportSourceAccount> = {},
): ReportSourceAccount {
  return {
    id,
    groupId: "cash",
    name: id,
    institution: "",
    kind: "current",
    currency: "GBP",
    excludedFromNetWorth: false,
    closedOn: null,
    position: 0,
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
    fxRates: [],
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
      { accountId: "current", day: SINCE_THE_START_DAY, balanceMinor: 0 },
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
          { accountId: "current", day: SINCE_THE_START_DAY, balanceMinor: 1 },
          { accountId: "current", day: "2019-03-06", balanceMinor: 1500_00 },
        ],
      ),
    );
    expect(context.firstDay).toBe(SINCE_THE_START_DAY);
  });

  it("is null when no counted Account has a balance other than zero", () => {
    const context = createReportContext(
      source(
        [account("current")],
        [{ accountId: "current", day: SINCE_THE_START_DAY, balanceMinor: 0 }],
      ),
    );
    expect(context.firstDay).toBeNull();
  });
});
