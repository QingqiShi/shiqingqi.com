import { describe, expect, it } from "vitest";
import { selectEntriesByTransaction } from "../store/select-entries-by-transaction.ts";
import { selectTagIdsByTransaction } from "../store/select-tag-ids-by-transaction.ts";
import {
  createTestReplica,
  TEST_IDS,
  testExpense,
  testReplicaRows,
} from "../transactions/testing/create-test-replica.ts";
import { applyWithUndo } from "./apply-with-undo.ts";
import type { ReplicaSnapshot } from "./types.ts";

const ids = TEST_IDS;

function transactionView(snapshot: ReplicaSnapshot, id: string) {
  const row = snapshot.tables.transactions.get(id);
  if (!row) return null;
  return {
    kind: row.kind,
    status: row.status,
    date: row.date,
    amountMinor: row.amountMinor,
    categoryId: row.categoryId,
    payeeId: row.payeeId,
    memberId: row.memberId,
    note: row.note,
    needsReview: row.needsReview,
    deleted: row.deletedAt !== null,
    entries: (selectEntriesByTransaction(snapshot).get(id) ?? []).map(
      (entry) => [entry.id, entry.accountId, entry.amountMinor],
    ),
    tagIds: [...(selectTagIdsByTransaction(snapshot).get(id) ?? [])].sort(),
  };
}

let counter = 0;
function createId() {
  counter++;
  return `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
}

describe("applyWithUndo", () => {
  it("puts back every field, Entry and Tag an update changed", async () => {
    const { store } = await createTestReplica();
    const before = transactionView(store.getSnapshot(), ids.tescoShop);
    const { undo } = applyWithUndo(
      store,
      [
        {
          name: "updateTransaction",
          args: {
            id: ids.tescoShop,
            patch: {
              amountMinor: -999,
              note: "changed",
              needsReview: true,
              entries: [
                {
                  id: createId(),
                  accountId: ids.current,
                  amountMinor: -999,
                  fxRate: null,
                },
              ],
              tagIds: [ids.weeklyShop],
            },
          },
        },
      ],
      createId,
    );
    expect(transactionView(store.getSnapshot(), ids.tescoShop)).not.toEqual(
      before,
    );
    expect(undo).not.toBeNull();
    applyWithUndo(store, undo ?? [], createId);
    expect(transactionView(store.getSnapshot(), ids.tescoShop)).toEqual(before);
  });

  it("deletes what it created and restores what it deleted", async () => {
    const { store } = await createTestReplica();
    const created = createId();
    const first = applyWithUndo(
      store,
      [
        {
          name: "createTransaction",
          args: {
            id: created,
            kind: "expense",
            date: "2026-09-30",
            amountMinor: -420,
            categoryId: ids.dining,
            entries: [
              {
                id: createId(),
                accountId: ids.card,
                amountMinor: -420,
                fxRate: null,
              },
            ],
          },
        },
        { name: "deleteTransaction", args: { id: ids.tescoShop } },
      ],
      createId,
    );
    expect(transactionView(store.getSnapshot(), ids.tescoShop)?.deleted).toBe(
      true,
    );
    applyWithUndo(store, first.undo ?? [], createId);
    const snapshot = store.getSnapshot();
    expect(transactionView(snapshot, ids.tescoShop)?.deleted).toBe(false);
    expect(transactionView(snapshot, created)?.deleted).toBe(true);
  });

  it("brings back a confirmed Expected Transaction as Expected", async () => {
    const rows = testReplicaRows();
    const bill = testExpense(createId(), createId(), {
      date: "2026-10-02",
      amountMinor: -1_099,
      accountId: ids.card,
      payeeId: ids.netflix,
      status: "expected",
    });
    rows.transactions = [...(rows.transactions ?? []), bill.transaction];
    rows.entries = [...(rows.entries ?? []), bill.entry];
    const { store } = await createTestReplica(rows);
    const { undo } = applyWithUndo(
      store,
      [
        {
          name: "confirmExpected",
          args: { id: bill.transaction.id, patch: { amountMinor: -1_299 } },
        },
      ],
      createId,
    );
    applyWithUndo(store, undo ?? [], createId);
    const snapshot = store.getSnapshot();
    expect(transactionView(snapshot, bill.transaction.id)?.deleted).toBe(true);
    const again = [...snapshot.tables.transactions.values()].find(
      (row) =>
        row.payeeId === ids.netflix &&
        row.status === "expected" &&
        row.deletedAt === null,
    );
    expect(again).toMatchObject({ date: "2026-10-02", amountMinor: -1_099 });
  });

  it("puts back a balance update and a renamed, archived Category", async () => {
    const { store } = await createTestReplica();
    const valuationId = createId();
    const category = store.getSnapshot().tables.categories.get(ids.dining);
    const { undo } = applyWithUndo(
      store,
      [
        {
          name: "putValuation",
          args: {
            id: valuationId,
            accountId: ids.isa,
            on: "2026-09-30",
            amountMinor: 1_000_00,
          },
        },
        {
          name: "upsertCategory",
          args: { id: ids.dining, name: "Eating out", archived: true },
        },
      ],
      createId,
    );
    applyWithUndo(store, undo ?? [], createId);
    const snapshot = store.getSnapshot();
    expect(snapshot.tables.valuations.get(valuationId)?.deletedAt).not.toBe(
      null,
    );
    expect(snapshot.tables.categories.get(ids.dining)).toMatchObject({
      name: category?.name,
      archivedAt: null,
    });
  });

  it("undoes the earlier mutations of a batch when one is refused", async () => {
    const { store } = await createTestReplica();
    const before = transactionView(store.getSnapshot(), ids.tescoShop);
    expect(() =>
      applyWithUndo(
        store,
        [
          {
            name: "updateTransaction",
            args: { id: ids.tescoShop, patch: { note: "first" } },
          },
          {
            name: "updateTransaction",
            args: { id: createId(), patch: { note: "missing" } },
          },
        ],
        createId,
      ),
    ).toThrow();
    expect(transactionView(store.getSnapshot(), ids.tescoShop)).toEqual(before);
  });

  it("gives no Undo for a Payee merge", async () => {
    const { store } = await createTestReplica();
    const { undo } = applyWithUndo(
      store,
      [
        {
          name: "mergePayee",
          args: { fromId: ids.netflix, intoId: ids.tesco },
        },
      ],
      createId,
    );
    expect(undo).toBeNull();
  });
});
