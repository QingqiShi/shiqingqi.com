import { describe, expect, it } from "vitest";
import { summariseBankSync } from "./summarise-bank-sync.ts";

const link = {
  linkId: "l",
  error: null,
  waiting: 0,
  linked: 0,
  confirmed: 0,
  missing: 0,
};

describe("summariseBankSync", () => {
  it("counts new, matched and to-review rows per account and leaves out quiet links", () => {
    const lines = summariseBankSync(
      {
        clock: 1,
        links: [
          { ...link, accountId: "visa", waiting: 12, linked: 28, confirmed: 2 },
          { ...link, accountId: "quiet" },
          { ...link, accountId: "broken", error: "rate_limited" },
        ],
      },
      (accountId) =>
        ({ visa: "Alex Visa", broken: "Sam Current" })[accountId] ?? "",
      (accountId) => (accountId === "visa" ? 2 : 0),
    );
    expect(lines).toEqual([
      {
        name: "Alex Visa",
        waiting: 12,
        matched: 30,
        review: 2,
        failed: false,
      },
      {
        name: "Sam Current",
        waiting: 0,
        matched: 0,
        review: 0,
        failed: true,
      },
    ]);
  });
});
