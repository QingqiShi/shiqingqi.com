import { describe, expect, it } from "vitest";
import { ordersNeedingCheck } from "./orders-needing-check.ts";
import { statusAfterCheck } from "./status-after-check.ts";
import { testOrder } from "./test-plan.ts";

const MONDAY = "2026-11-23";
const order = (
  placedFor: string,
  validUntil: string,
  checkedThrough: string | null,
) =>
  testOrder({
    id: `${placedFor}-${String(checkedThrough)}`,
    symbol: "VOD.L",
    side: "buy",
    quantity: 100,
    limitPrice: 0.7,
    placedFor,
    validUntil,
    checkedThrough,
  });

describe("ordersNeedingCheck", () => {
  it("waits for each session before the meeting, the Friday before a Monday", () => {
    const checkedFriday = order("2026-11-19", "2026-11-25", "2026-11-20");
    const checkedThursday = order("2026-11-19", "2026-11-25", "2026-11-19");
    const neverChecked = order("2026-11-20", "2026-11-26", null);
    const placedToday = order(MONDAY, "2026-11-25", null);
    const checkedToItsEnd = order("2026-11-16", "2026-11-17", "2026-11-17");

    expect(
      ordersNeedingCheck(
        [
          checkedFriday,
          checkedThursday,
          neverChecked,
          placedToday,
          checkedToItsEnd,
        ],
        MONDAY,
      ),
    ).toEqual([
      { order: checkedThursday, through: "2026-11-20" },
      { order: neverChecked, through: "2026-11-20" },
    ]);
  });
});

describe("statusAfterCheck", () => {
  it("expires an order once its last session is checked without a fill", () => {
    const live = order("2026-11-19", "2026-11-23", null);
    expect(statusAfterCheck(live, "2026-11-20")).toBe("open");
    expect(statusAfterCheck(live, "2026-11-23")).toBe("expired");
  });
});
