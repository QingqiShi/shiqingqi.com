import { describe, expect, it } from "vitest";
import { TEST_FIXTURES } from "../ledger/test-fixtures.ts";
import { summariseFillHint } from "./summarise-fill-hint.ts";

const { bar } = TEST_FIXTURES;

describe("summariseFillHint", () => {
  const bars = new Map([
    [
      "VOD.L",
      [
        bar("2026-11-23", 1.05, { open: 1.04, low: 0.98, high: 1.06 }),
        bar("2026-11-24", 1.04, { open: 1.04, low: 1.02, high: 1.05 }),
        bar("2026-11-25", 1.03, { open: 1.03, low: 1.01, high: 1.04 }),
        bar("2026-11-26", 0.98, { open: 0.97, low: 0.95, high: 0.99 }),
      ],
    ],
  ]);
  const buy = {
    symbol: "VOD.L",
    side: "buy" as const,
    limitPrice: 1,
    placedFor: "2026-11-23",
    validUntil: "2026-11-27",
    checkedThrough: "2026-11-23",
  };

  it("skips the sessions the owner has already answered for", () => {
    expect(summariseFillHint(buy, bars, "2026-11-26")).toEqual({
      kind: "reachable",
      date: "2026-11-26",
      extreme: 0.95,
      price: 0.97,
    });
  });

  it("names the session that came closest when none reached the limit", () => {
    expect(summariseFillHint(buy, bars, "2026-11-25")).toEqual({
      kind: "unreachable",
      date: "2026-11-25",
      extreme: 1.01,
    });
  });

  it("says so when no stored session is left to judge", () => {
    expect(
      summariseFillHint(
        { ...buy, checkedThrough: "2026-11-26" },
        bars,
        "2026-11-26",
      ),
    ).toEqual({ kind: "no_sessions" });
  });
});
