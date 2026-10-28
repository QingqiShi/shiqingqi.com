import { describe, expect, it } from "vitest";
import { computeBalanceDays } from "../domain/balance/compute-balance-days.ts";
import { accountBalanceAt } from "../domain/balance/net-worth-at.ts";
import { balanceCheckOf, ledgerBalanceAt } from "./balance-check-of.ts";

const link = {
  bankBalanceMinor: -500,
  bankBalanceOn: "2026-10-08",
  bankRowsWaiting: false,
};

describe("balanceCheckOf", () => {
  it("finds nothing when the balances agree", () => {
    expect(balanceCheckOf(link, () => -500)).toBeNull();
  });

  it("reads our balance on the day the bank gave its balance", () => {
    const days: string[] = [];
    const check = balanceCheckOf(link, (day) => {
      days.push(day);
      return -800;
    });
    expect(days).toEqual(["2026-10-08"]);
    expect(check).toEqual({
      on: "2026-10-08",
      bankMinor: -500,
      oursMinor: -800,
      ourExcessMinor: -300,
    });
  });

  it("reads a closed account's own ledger, not the 0 that net worth counts", () => {
    const series = computeBalanceDays(
      [{ on: "2026-09-01", amountMinor: -500 }],
      [{ date: "2026-10-01", amountMinor: -300 }],
    );
    const closed = { closedOn: "2026-10-05" };
    expect(accountBalanceAt(closed, series, "2026-10-08")).toBe(0);

    const check = balanceCheckOf(link, (day) => ledgerBalanceAt(series, day));

    expect(check?.oursMinor).toBe(-800);
    expect(ledgerBalanceAt(undefined, "2026-10-08")).toBe(0);
  });
});
