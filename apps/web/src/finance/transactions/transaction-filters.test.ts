import { describe, expect, it } from "vitest";
import {
  EMPTY_TRANSACTION_FILTERS,
  transactionFilters,
} from "./transaction-filters.ts";

const A = "0b6f5d4e-5c1a-4f6e-9d2b-1a2b3c4d5e6f";
const B = "7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f";

describe("transactionFilters", () => {
  it("reads repeated and comma-split ids, and drops what it cannot read", () => {
    const filters = transactionFilters.parse(
      new URLSearchParams(
        `account=${A}&account=${B},nope&category=${A}&kind=expense,refund&kind=income&tag=x`,
      ),
    );
    expect(filters.accountIds).toEqual([A, B]);
    expect(filters.categoryIds).toEqual([A]);
    expect(filters.tagIds).toEqual([]);
    expect(filters.kinds).toEqual(["expense", "income"]);
  });

  it("reads flags, a day range in either order, and the search", () => {
    const filters = transactionFilters.parse(
      new URLSearchParams(
        "review=1&expected=true&from=2026-10-09&to=2026-09-01&q=%20ocado%20",
      ),
    );
    expect(filters).toMatchObject({
      review: true,
      expected: true,
      from: "2026-09-01",
      to: "2026-10-09",
      query: "ocado",
    });
    expect(
      transactionFilters.parse(new URLSearchParams("from=2026-02-30&review=0")),
    ).toEqual(EMPTY_TRANSACTION_FILTERS);
  });

  it("writes the filters back and keeps the other params", () => {
    const params = transactionFilters.write(
      new URLSearchParams(`id=${A}&account=${B}&q=old`),
      {
        ...EMPTY_TRANSACTION_FILTERS,
        payeeIds: [A, B],
        kinds: ["transfer"],
        review: true,
        from: "2026-01-01",
      },
    );
    expect(params.get("id")).toBe(A);
    expect(params.get("account")).toBeNull();
    expect(params.get("q")).toBeNull();
    expect(transactionFilters.parse(params)).toEqual({
      ...EMPTY_TRANSACTION_FILTERS,
      payeeIds: [A, B],
      kinds: ["transfer"],
      review: true,
      from: "2026-01-01",
    });
  });

  it("knows when nothing filters", () => {
    expect(transactionFilters.isEmpty(EMPTY_TRANSACTION_FILTERS)).toBe(true);
    expect(
      transactionFilters.isEmpty({
        ...EMPTY_TRANSACTION_FILTERS,
        memberIds: [A],
      }),
    ).toBe(false);
  });
});
