import { describe, expect, it } from "vitest";
import { ledgerRunningBalances } from "./ledger-running-balances.ts";

const endOfDay: Record<string, number> = {
  "2026-10-10": 50_000,
  "2026-10-09": 52_000,
  "2026-10-08": 60_000,
};

function balanceAt(day: string) {
  return endOfDay[day] ?? 0;
}

describe("ledgerRunningBalances", () => {
  it("walks back from each day's closing balance", () => {
    expect(
      ledgerRunningBalances(
        [
          { day: "2026-10-10", entry: { amountMinor: -1_500, counts: true } },
          { day: "2026-10-10", entry: { amountMinor: -500, counts: true } },
          { day: "2026-10-09", entry: { amountMinor: -8_000, counts: true } },
        ],
        balanceAt,
      ),
    ).toEqual([50_000, 51_500, 52_000]);
  });

  it("leaves out Expected Entries and Entries inside a Valuation", () => {
    expect(
      ledgerRunningBalances(
        [
          { day: "2026-10-10", entry: { amountMinor: -900, counts: false } },
          { day: "2026-10-10", entry: { amountMinor: -1_500, counts: true } },
          { day: "2026-10-08", valuationMinor: 60_000 },
          { day: "2026-10-08", entry: { amountMinor: -2_000, counts: true } },
        ],
        balanceAt,
      ),
    ).toEqual([null, 50_000, 60_000, null]);
  });
});
