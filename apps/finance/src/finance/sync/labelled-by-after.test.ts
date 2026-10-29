import { describe, expect, it } from "vitest";
import { labelledByAfter } from "./labelled-by-after.ts";

const before = {
  labelledBy: "ai" as const,
  kind: "expense",
  categoryId: "groceries",
  payeeId: "tesco",
  memberId: "alex",
  note: "",
  needsReview: true,
  entries: [{ accountId: "current" }],
  tagIds: ["a", "b"],
};

describe("labelledByAfter", () => {
  it("gives the labels to a Member who changes one or clears Review", () => {
    for (const change of [
      { kind: "income" },
      { categoryId: "eating-out" },
      { payeeId: null },
      { memberId: "sam" },
      { note: "lunch" },
      { tagIds: ["a"] },
      { entries: [{ accountId: "card" }] },
      { needsReview: false },
    ]) {
      expect(labelledByAfter("member", before, { ...before, ...change })).toBe(
        "member",
      );
    }
  });

  it("keeps the AI for a date or amount change, a reordered Tag list, or a server change", () => {
    expect(labelledByAfter("member", before, { ...before })).toBe("ai");
    expect(
      labelledByAfter("member", before, { ...before, tagIds: ["b", "a"] }),
    ).toBe("ai");
    expect(
      labelledByAfter("server", before, {
        ...before,
        needsReview: false,
        entries: [{ accountId: "savings" }],
      }),
    ).toBe("ai");
  });

  it("never gives a Member's labels back to the AI", () => {
    expect(
      labelledByAfter(
        "server",
        { ...before, labelledBy: "member" },
        { ...before, categoryId: "other" },
      ),
    ).toBe("member");
  });
});
