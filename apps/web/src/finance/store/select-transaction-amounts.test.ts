import { describe, expect, it } from "vitest";
import { addDays } from "../domain/dates/add-days.ts";
import { expectWithinBudget } from "../testing/expect-within-budget.ts";
import {
  createTestReplica,
  TEST_IDS as ids,
  testExpense,
  testReplicaRows,
} from "../transactions/testing/create-test-replica.ts";
import { selectEntriesByTransaction } from "./select-entries-by-transaction.ts";
import { selectTransactionAmounts } from "./select-transaction-amounts.ts";

function uuid(at: number, kind: "1" | "2") {
  return `00000000-0000-4000-8${kind}00-${at.toString(16).padStart(12, "0")}`;
}

async function replicaWithExpenses(count: number) {
  const rows = testReplicaRows();
  const expenses = Array.from({ length: count }, (_, at) =>
    testExpense(uuid(at, "1"), uuid(at, "2"), {
      date: addDays("2024-01-01", at % 1_000),
      amountMinor: -1_000 - at,
      accountId: at % 3 === 0 ? ids.dollars : ids.card,
    }),
  );
  rows.transactions = [
    ...(rows.transactions ?? []),
    ...expenses.map((expense) => expense.transaction),
  ];
  rows.entries = [
    ...(rows.entries ?? []),
    ...expenses.map((expense) => expense.entry),
  ];
  return createTestReplica(rows);
}

function editFirstExpense(
  runtime: Awaited<ReturnType<typeof replicaWithExpenses>>,
  amountMinor = -2_500,
) {
  runtime.store.applyLocal({
    name: "updateTransaction",
    args: {
      id: uuid(0, "1"),
      patch: {
        entries: [{ id: uuid(0, "2"), accountId: ids.card, amountMinor }],
      },
    },
  });
}

describe("selectTransactionAmounts", () => {
  it("works out again only the Transaction whose Entries changed", async () => {
    const runtime = await replicaWithExpenses(3);
    const before = runtime.store.getSnapshot();
    const entriesBefore = selectEntriesByTransaction(before);
    const amountsBefore = selectTransactionAmounts(before);

    editFirstExpense(runtime);
    const after = runtime.store.getSnapshot();
    const entriesAfter = selectEntriesByTransaction(after);
    const amountsAfter = selectTransactionAmounts(after);

    expect(entriesAfter.get(uuid(0, "1"))).not.toBe(
      entriesBefore.get(uuid(0, "1")),
    );
    expect(entriesAfter.get(uuid(1, "1"))).toBe(
      entriesBefore.get(uuid(1, "1")),
    );
    expect(amountsAfter.get(uuid(0, "1"))).toBe(-2_500);
    expect(amountsAfter.get(uuid(1, "1"))).toBe(
      amountsBefore.get(uuid(1, "1")),
    );
  });

  it("takes in an edit to one of 60k Transactions in a few frames", async () => {
    const runtime = await replicaWithExpenses(60_000);
    selectTransactionAmounts(runtime.store.getSnapshot());

    const times: number[] = [];
    for (let edit = 1; edit <= 5; edit++) {
      editFirstExpense(runtime, -2_500 - edit);
      const snapshot = runtime.store.getSnapshot();
      selectEntriesByTransaction(snapshot);
      const started = performance.now();
      const amounts = selectTransactionAmounts(snapshot);
      times.push(performance.now() - started);
      expect(amounts.get(uuid(0, "1"))).toBe(-2_500 - edit);
    }
    expectWithinBudget(Math.min(...times), 50);
  });
});
