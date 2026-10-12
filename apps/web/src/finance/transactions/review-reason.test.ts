import { describe, expect, it } from "vitest";
import { reviewReason } from "./review-reason.ts";

const lookups = {
  accountById: new Map([
    ["current", { isSystem: false, currency: "GBP" }],
    ["in-transit", { isSystem: true, currency: "GBP" }],
  ]),
  categoryById: new Map([
    ["groceries", { isSystem: false }],
    ["uncategorised", { isSystem: true }],
  ]),
};

const row = {
  kind: "expense" as const,
  labelledBy: "ai" as const,
  aiReason: null,
  categoryId: "groceries",
};

describe("reviewReason", () => {
  it("asks where the money went while a transfer is In transit", () => {
    expect(
      reviewReason(
        { ...row, kind: "transfer", categoryId: null, aiReason: "Rent?" },
        [
          { accountId: "current", amountMinor: -50_000 },
          { accountId: "in-transit", amountMinor: 50_000 },
        ],
        lookups,
      ),
    ).toEqual({ type: "inTransit", amountMinor: 50_000, currency: "GBP" });
  });

  it("gives the AI's reason, then says when the AI could not label", () => {
    expect(reviewReason({ ...row, aiReason: "New shop" }, [], lookups)).toEqual(
      { type: "ai", text: "New shop" },
    );
    expect(
      reviewReason({ ...row, categoryId: "uncategorised" }, [], lookups),
    ).toEqual({ type: "aiFailed" });
    expect(reviewReason(row, [], lookups)).toBeNull();
  });

  it("gives no AI reason for a Member's Transaction", () => {
    expect(
      reviewReason(
        { ...row, labelledBy: "member", aiReason: "Old reason" },
        [],
        lookups,
      ),
    ).toBeNull();
  });
});
