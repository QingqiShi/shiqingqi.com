import { describe, expect, it } from "vitest";
import { isInReview } from "./is-in-review.ts";

const TODAY = "2026-10-10";
const accountById = new Map([
  ["current", { isSystem: false }],
  ["in-transit", { isSystem: true }],
]);

function transfer(inTransitOn: string, needsReview = false) {
  return isInReview(
    { needsReview },
    [
      { accountId: "current", date: "2026-09-01" },
      { accountId: "in-transit", date: inTransitOn },
    ],
    accountById,
    TODAY,
  );
}

describe("isInReview", () => {
  it("puts money In transit for more than five days in Review, with no flag", () => {
    expect(transfer("2026-10-04")).toBe(true);
    expect(transfer("2026-10-05")).toBe(false);
    expect(transfer("2026-10-09")).toBe(false);
  });

  it("follows the flag when nothing is In transit too long", () => {
    expect(transfer("2026-10-09", true)).toBe(true);
    expect(
      isInReview(
        { needsReview: false },
        [{ accountId: "current", date: "2026-01-01" }],
        accountById,
        TODAY,
      ),
    ).toBe(false);
  });
});
