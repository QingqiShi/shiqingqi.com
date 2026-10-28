import { expect, test } from "vitest";
import { financeHref } from "../navigation/finance-href.ts";
import { transactionFilters } from "../transactions/transaction-filters.ts";
import { analyticsParams } from "./analytics-params.ts";
import { DEFAULT_ANALYTICS_STATE } from "./compute-analytics-view.ts";
import { transactionsBehind } from "./transactions-behind.ts";

const CATEGORY = "00000000-0000-4000-8000-0000000000d1";
const MEMBER = "00000000-0000-4000-8000-0000000000a1";

test("reads back what it writes, and leaves defaults out of the URL", () => {
  const state = {
    ...DEFAULT_ANALYTICS_STATE,
    range: "custom" as const,
    from: "2026-01-01",
    to: "2026-03-31",
    grouping: "week" as const,
    member: MEMBER,
    kind: "net" as const,
    category: CATEGORY,
    dimension: "transaction" as const,
    excludeOutliers: true,
  };
  expect(analyticsParams.parse(analyticsParams.write(state))).toEqual(state);
  expect(analyticsParams.write(DEFAULT_ANALYTICS_STATE).toString()).toBe("");
  expect(
    analyticsParams.parse(
      new URLSearchParams(
        "range=decade&kind=gifts&category=nope&from=2026-02-30",
      ),
    ),
  ).toEqual(DEFAULT_ANALYTICS_STATE);
});

test("links to the Transactions list through its filter contract", () => {
  const href = financeHref(
    transactionsBehind({
      from: "2026-09-01",
      to: "2026-09-30",
      kind: "spending",
      member: MEMBER,
      categoryIds: [CATEGORY],
    }),
    "en",
  );
  const [path, query] = href.split("?");
  expect(path).toBe("/finance/transactions");
  expect(transactionFilters.parse(new URLSearchParams(query))).toMatchObject({
    from: "2026-09-01",
    to: "2026-09-30",
    kinds: ["expense"],
    memberIds: [MEMBER],
    categoryIds: [CATEGORY],
  });
});
