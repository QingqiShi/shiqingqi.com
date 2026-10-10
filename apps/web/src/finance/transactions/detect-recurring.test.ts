import { describe, expect, it } from "vitest";
import { detectRecurring } from "./detect-recurring.ts";
import { ruleFromTransaction } from "./rule-from-transaction.ts";

function row(id: string, date: string, amountMinor = -1_099) {
  return {
    id,
    date,
    amountMinor,
    kind: "expense" as const,
    status: "posted" as const,
    deletedAt: null,
  };
}

describe("detectRecurring", () => {
  it("finds a monthly pattern across uneven months", () => {
    const latest = row("t4", "2026-03-01");
    const history = [
      latest,
      row("t3", "2026-02-01", -1_050),
      row("t2", "2026-01-01"),
      row("t1", "2025-12-02"),
    ];
    expect(detectRecurring(latest, history)).toEqual({
      unit: "month",
      interval: 1,
      dayOfMonth: 1,
      weekday: null,
      monthOfYear: null,
      anchorDate: "2026-03-01",
    });
  });

  it("finds weekly and yearly patterns", () => {
    const weekly = row("w4", "2026-10-07");
    expect(
      detectRecurring(weekly, [
        row("w3", "2026-09-30"),
        row("w2", "2026-09-22"),
        row("w1", "2026-09-16"),
      ]),
    ).toMatchObject({ unit: "week", weekday: 3 });
    const yearly = row("y4", "2026-04-06", -16_500);
    expect(
      detectRecurring(yearly, [
        row("y3", "2025-04-04", -16_500),
        row("y2", "2024-04-06", -16_000),
        row("y1", "2023-04-10", -16_500),
      ]),
    ).toMatchObject({ unit: "year", dayOfMonth: 6, monthOfYear: 4 });
  });

  it("needs three earlier near-equal amounts and a steady gap", () => {
    const latest = row("t4", "2026-03-01");
    expect(
      detectRecurring(latest, [
        row("t3", "2026-02-01"),
        row("t2", "2026-01-01"),
      ]),
    ).toBeNull();
    expect(
      detectRecurring(latest, [
        row("t3", "2026-02-01", -2_000),
        row("t2", "2026-01-01"),
        row("t1", "2025-12-01"),
      ]),
    ).toBeNull();
    expect(
      detectRecurring(latest, [
        row("t3", "2026-02-01"),
        row("t2", "2026-01-12"),
        row("t1", "2025-12-01"),
      ]),
    ).toBeNull();
  });
});

describe("ruleFromTransaction", () => {
  it("starts the Rule at the first occurrence after today", () => {
    const args = ruleFromTransaction({
      ruleId: "00000000-0000-4000-8000-000000000001",
      name: "Netflix",
      transaction: {
        id: "t",
        householdId: "h",
        kind: "expense",
        status: "posted",
        date: "2026-09-28",
        amountMinor: -1_099,
        categoryId: "c",
        payeeId: "p",
        memberId: "m",
        ruleId: null,
        refundOfId: null,
        note: "",
        source: "manual",
        needsReview: false,
        aiConfidence: null,
        searchText: "",
        version: 1,
        createdAt: "2026-09-28T10:00:00.000Z",
        updatedAt: "2026-09-28T10:00:00.000Z",
        deletedAt: null,
      },
      entries: [
        {
          id: "e",
          householdId: "h",
          transactionId: "t",
          accountId: "a",
          date: "2026-09-28",
          amountMinor: -1_099,
          fxRate: null,
          position: 0,
          version: 1,
          createdAt: "2026-09-28T10:00:00.000Z",
          updatedAt: "2026-09-28T10:00:00.000Z",
          deletedAt: null,
        },
      ],
      tagIds: ["tag"],
      pattern: null,
      today: "2026-10-10",
    });
    expect(args).toMatchObject({
      unit: "month",
      dayOfMonth: 28,
      startsOn: "2026-10-28",
      nextOn: "2026-10-28",
      template: {
        kind: "expense",
        amountMinor: -1_099,
        entries: [{ accountId: "a", amountMinor: -1_099 }],
        tagIds: ["tag"],
      },
    });
  });
});
