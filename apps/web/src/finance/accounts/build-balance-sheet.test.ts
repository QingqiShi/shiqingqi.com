import { describe, expect, it } from "vitest";
import { computeBalanceDays } from "../domain/balance/compute-balance-days.ts";
import { createFxIndex } from "../domain/balance/create-fx-index.ts";
import { netWorthAt } from "../domain/balance/net-worth-at.ts";
import type {
  AccountGroupRow,
  AccountRow,
  BankLinkRow,
} from "../sync/row-schemas.ts";
import {
  testAccount,
  testStamps,
} from "../transactions/testing/create-test-replica.ts";
import { buildBalanceSheet } from "./build-balance-sheet.ts";

function group(
  id: string,
  side: "asset" | "liability",
  position: number,
): AccountGroupRow {
  return { id, householdId: "h", name: id, side, position, ...testStamps };
}

function account(
  id: string,
  groupId: string,
  kind: AccountRow["kind"],
  fields: Partial<AccountRow> = {},
) {
  return testAccount(id, { groupId, kind, ...fields });
}

describe("buildBalanceSheet", () => {
  const groups = [
    group("cash", "asset", 0),
    group("cards", "liability", 1),
    group("empty", "asset", 2),
  ];
  const accounts = [
    account("current", "cash", "cash"),
    account("dollars", "cash", "cash", { currency: "USD" }),
    account("old", "cash", "cash", { closedOn: "2026-06-01" }),
    account("tracked", "cash", "receivable", { excludedFromNetWorth: true }),
    account("amex", "cards", "credit", { creditLimitMinor: 600_000 }),
  ];
  const series = new Map([
    [
      "current",
      computeBalanceDays([{ on: "2026-09-01", amountMinor: 245_001 }], []),
    ],
    [
      "dollars",
      computeBalanceDays([{ on: "2026-09-01", amountMinor: 10_001 }], []),
    ],
    [
      "old",
      computeBalanceDays([{ on: "2026-01-01", amountMinor: 99_999 }], []),
    ],
    [
      "tracked",
      computeBalanceDays([{ on: "2026-09-01", amountMinor: 50_000 }], []),
    ],
    [
      "amex",
      computeBalanceDays([{ on: "2026-09-01", amountMinor: -32_050 }], []),
    ],
  ]);
  const fx = createFxIndex(
    [{ base: "USD", quote: "GBP", on: "2026-01-01", rate: 0.7777 }],
    "GBP",
  );
  const sheet = buildBalanceSheet({
    groups,
    accounts,
    members: [],
    latestValuations: new Map(),
    bankLinks: [],
    seriesByAccount: series,
    fx,
    day: "2026-10-10",
  });

  it("sums each Group in the base currency and leaves out closed and excluded accounts", () => {
    expect(
      sheet.sections.map((section) => [section.group.id, section.subtotal]),
    ).toEqual([
      ["cash", 252_779],
      ["cards", -32_050],
      ["empty", 0],
    ]);
    expect(sheet.assets).toBe(252_779);
    expect(sheet.liabilities).toBe(-32_050);
  });

  it("agrees with netWorthAt to the penny", () => {
    expect(sheet.netWorth).toBe(netWorthAt(accounts, series, fx, "2026-10-10"));
  });

  it("marks hidden accounts and works out credit available", () => {
    const lines = sheet.sections.flatMap((section) => section.lines);
    const byId = new Map(lines.map((line) => [line.account.id, line]));
    expect(byId.get("old")?.hidden).toBe("closed");
    expect(byId.get("old")?.balance).toBe(0);
    expect(byId.get("tracked")?.hidden).toBe("excluded");
    expect(byId.get("dollars")?.baseBalance).toBe(7_778);
    expect(byId.get("amex")?.available).toBe(567_950);
  });
});

describe("buildBalanceSheet with In transit", () => {
  const groups = [group("cash", "asset", 0)];
  const fx = createFxIndex([], "GBP");

  function sheetWith(
    inTransitEntries: { date: string; amountMinor: number }[],
  ) {
    const accounts = [
      account("current", "cash", "cash"),
      account("in-transit", "cash", "cash", { isSystem: true }),
    ];
    const series = new Map([
      [
        "current",
        computeBalanceDays(
          [{ on: "2026-09-01", amountMinor: 100_000 }],
          [{ date: "2026-10-08", amountMinor: -50_000 }],
        ),
      ],
      ["in-transit", computeBalanceDays([], inTransitEntries)],
    ]);
    const sheet = buildBalanceSheet({
      groups,
      accounts,
      members: [],
      latestValuations: new Map(),
      bankLinks: [],
      seriesByAccount: series,
      fx,
      day: "2026-10-10",
    });
    return { sheet, netWorth: netWorthAt(accounts, series, fx, "2026-10-10") };
  }

  it("lists and counts In transit while money is on its way", () => {
    const { sheet, netWorth } = sheetWith([
      { date: "2026-10-08", amountMinor: 50_000 },
    ]);
    expect(
      sheet.sections[0].lines.map((line) => [line.account.id, line.balance]),
    ).toEqual([
      ["current", 50_000],
      ["in-transit", 50_000],
    ]);
    expect(sheet.netWorth).toBe(100_000);
    expect(netWorth).toBe(100_000);
  });
});

describe("buildBalanceSheet with a Bank link", () => {
  const groups = [group("cash", "asset", 0)];
  const fx = createFxIndex([], "GBP");
  const accounts = [
    account("current", "cash", "cash"),
    account("savings", "cash", "cash"),
  ];
  const series = new Map([
    [
      "current",
      computeBalanceDays(
        [{ on: "2026-09-01", amountMinor: 100_000 }],
        [{ date: "2026-10-09", amountMinor: -2_500 }],
      ),
    ],
    [
      "savings",
      computeBalanceDays([{ on: "2026-09-01", amountMinor: 5_000 }], []),
    ],
  ]);

  function bankLink(accountId: string, bankBalanceMinor: number): BankLinkRow {
    return {
      id: `link-${accountId}`,
      householdId: "h",
      accountId,
      providerName: "",
      providerInstitution: "",
      currency: "GBP",
      lastSyncedOn: "2026-10-08",
      lastSyncAt: null,
      lastError: null,
      status: "active",
      bankBalanceMinor,
      bankBalanceOn: "2026-10-08",
      bankRowsWaiting: false,
      version: 1,
      deletedAt: null,
    };
  }

  it("checks each linked account against the bank on the day the bank gave its balance", () => {
    const sheet = buildBalanceSheet({
      groups,
      accounts,
      members: [],
      latestValuations: new Map(),
      bankLinks: [bankLink("current", 99_000), bankLink("savings", 5_000)],
      seriesByAccount: series,
      fx,
      day: "2026-10-10",
    });
    const [current, savings] = sheet.sections[0].lines;
    expect(current.balanceCheck).toEqual({
      on: "2026-10-08",
      bankMinor: 99_000,
      oursMinor: 100_000,
      ourExcessMinor: 1_000,
    });
    expect(savings.balanceCheck).toBeNull();
  });
});
