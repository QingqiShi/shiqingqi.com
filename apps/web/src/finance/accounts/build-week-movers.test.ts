import { describe, expect, it } from "vitest";
import { computeBalanceDays } from "../domain/balance/compute-balance-days.ts";
import { createFxIndex } from "../domain/balance/create-fx-index.ts";
import { netWorthAt } from "../domain/balance/net-worth-at.ts";
import { testAccount } from "../transactions/testing/create-test-replica.ts";
import { buildWeekMovers } from "./build-week-movers.ts";

const FROM = "2026-10-03";
const TO = "2026-10-10";

function series(points: [string, number][]) {
  return computeBalanceDays(
    points.map(([on, amountMinor]) => ({ on, amountMinor })),
    [],
  );
}

describe("buildWeekMovers", () => {
  const accounts = [
    testAccount("current"),
    testAccount("savings"),
    testAccount("mortgage", { kind: "loan" }),
    testAccount("dollars", { currency: "USD" }),
    testAccount("still"),
    testAccount("tracked", { excludedFromNetWorth: true }),
    testAccount("closed", { closedOn: "2026-10-08" }),
  ];
  const seriesByAccount = new Map([
    [
      "current",
      series([
        ["2026-09-01", 100_000],
        ["2026-10-05", 70_000],
      ]),
    ],
    [
      "savings",
      series([
        ["2026-09-01", 500_000],
        ["2026-10-06", 520_000],
      ]),
    ],
    [
      "mortgage",
      series([
        ["2026-09-01", -20_000_000],
        ["2026-10-07", -19_950_000],
      ]),
    ],
    [
      "dollars",
      series([
        ["2026-09-01", 10_000],
        ["2026-10-09", 20_000],
      ]),
    ],
    ["still", series([["2026-09-01", 1_000]])],
    [
      "tracked",
      series([
        ["2026-09-01", 0],
        ["2026-10-09", 900_000],
      ]),
    ],
    ["closed", series([["2026-09-01", 40_000]])],
  ]);
  const fx = createFxIndex(
    [
      { base: "USD", quote: "GBP", on: "2026-09-01", rate: 0.8 },
      { base: "USD", quote: "GBP", on: "2026-10-08", rate: 0.75 },
    ],
    "GBP",
  );
  const input = { accounts, seriesByAccount, fx, from: FROM, to: TO };

  it("ranks the accounts by how far they moved net worth, gains and losses alike", () => {
    const movers = buildWeekMovers({ ...input, limit: 10 });
    expect(
      movers.map((mover) => [mover.account.id, mover.changeMinor]),
    ).toEqual([
      ["mortgage", 50_000],
      ["closed", -40_000],
      ["current", -30_000],
      ["savings", 20_000],
      ["dollars", 7_000],
    ]);
  });

  it("adds up to the change of net worth", () => {
    const movers = buildWeekMovers({ ...input, limit: 10 });
    const total = movers.reduce((sum, mover) => sum + mover.changeMinor, 0);
    expect(total).toBe(
      netWorthAt(accounts, seriesByAccount, fx, TO) -
        netWorthAt(accounts, seriesByAccount, fx, FROM),
    );
  });

  it("keeps only the biggest moves", () => {
    const movers = buildWeekMovers({ ...input, limit: 2 });
    expect(movers.map((mover) => mover.account.id)).toEqual([
      "mortgage",
      "closed",
    ]);
  });
});
