import { describe, expect, it } from "vitest";
import { computeBalanceDays } from "../domain/balance/compute-balance-days.ts";
import { createFxIndex } from "../domain/balance/create-fx-index.ts";
import { netWorthAt } from "../domain/balance/net-worth-at.ts";
import type { AccountGroupRow, AccountRow } from "../sync/row-schemas.ts";
import { buildBalanceSheet } from "./build-balance-sheet.ts";

const NOW = "2026-10-01T09:00:00.000Z";
const stamps = { version: 1, createdAt: NOW, updatedAt: NOW, deletedAt: null };

function group(
  id: string,
  side: "asset" | "liability",
  position: number,
): AccountGroupRow {
  return { id, householdId: "h", name: id, side, position, ...stamps };
}

function account(
  id: string,
  groupId: string,
  kind: AccountRow["kind"],
  fields: Partial<AccountRow> = {},
): AccountRow {
  return {
    id,
    householdId: "h",
    groupId,
    ownerMemberId: null,
    name: id,
    institution: "",
    kind,
    currency: "GBP",
    excludedFromNetWorth: false,
    closedOn: null,
    position: 0,
    creditLimitMinor: null,
    statementDay: null,
    paymentDueDay: null,
    defaultPaymentAccountId: null,
    ...stamps,
    ...fields,
  };
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
