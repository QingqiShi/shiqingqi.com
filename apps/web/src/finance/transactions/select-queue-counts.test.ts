import { describe, expect, it } from "vitest";
import { addDays } from "../domain/dates/add-days.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { selectQueueCounts } from "./select-queue-counts.ts";
import {
  createTestReplica,
  testExpense,
  testHousehold,
  testReplicaRows,
  TEST_IDS,
} from "./testing/create-test-replica.ts";

function expected(index: number, date: string) {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  return testExpense(id, `${id.slice(0, -4)}ffff`, {
    date,
    amountMinor: -100,
    accountId: TEST_IDS.card,
    status: "expected",
  });
}

describe("selectQueueCounts", () => {
  it("counts the Expected Transactions up to today, not the ones after it", async () => {
    const today = todayInTimeZone(testHousehold.timezone);
    const rows = testReplicaRows();
    const extra = [
      expected(1, addDays(today, -3)),
      expected(2, today),
      expected(3, addDays(today, 1)),
      expected(4, addDays(today, 6)),
    ];
    const runtime = await createTestReplica({
      ...rows,
      transactions: [
        ...(rows.transactions ?? []),
        ...extra.map((row) => row.transaction),
      ],
      entries: [...(rows.entries ?? []), ...extra.map((row) => row.entry)],
    });

    expect(selectQueueCounts(runtime.store.getSnapshot()).expected).toBe(2);
  });
});
