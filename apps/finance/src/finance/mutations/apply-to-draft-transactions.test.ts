import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { categories, transactions } from "../db/schema.ts";
import { mutation } from "../db/testing/mutation.ts";
import {
  db,
  expectRefused,
  expectSame,
  expense,
  home,
  NOW,
  onBothSides,
  push,
  recordExpense,
  rowsOf,
  setUpDraftTestHousehold,
} from "./test-apply-to-draft.ts";

setUpDraftTestHousehold();

describe("createTransaction", () => {
  it("adds the Transaction with its Entries, Tags and search text", async () => {
    const rows = rowsOf(await expectSame(expense({ note: "Weekly shop" })));
    expect(rows.transactions).toEqual([
      expect.objectContaining({
        searchText: "grocer weekly shop groceries",
        labelledBy: "member",
        source: "manual",
      }),
    ]);
    expect(rows.entries).toHaveLength(1);
    expect(rows.transactionTags).toHaveLength(1);
  });

  it.each([
    ["an unknown Category", () => ({ categoryId: randomUUID() })],
    ["a Category of the other kind", () => ({ categoryId: home.salaryId })],
    ["an unknown Member", () => ({ memberId: randomUUID() })],
  ])("refuses %s", async (_name, fields) => {
    const { browser, server } = await onBothSides(expense(fields()));
    expect(server).toMatchObject({ reason: "invalid" });
    expect(browser).toEqual(server);
  });

  it("refuses a transfer with one account twice", async () => {
    await expectRefused(
      mutation("createTransaction", {
        id: randomUUID(),
        kind: "transfer",
        date: "2026-10-05",
        entries: [
          { id: randomUUID(), accountId: home.currentId, amountMinor: -500 },
          { id: randomUUID(), accountId: home.currentId, amountMinor: 500 },
        ],
      }),
      "invalid",
      "A transfer needs two different accounts",
    );
  });

  it("refuses a deleted account", async () => {
    await push(mutation("upsertAccount", { id: home.cardId, deleted: true }));
    await expectRefused(
      expense({
        entries: [
          { id: randomUUID(), accountId: home.cardId, amountMinor: -1 },
        ],
      }),
      "invalid",
      "Unknown account",
    );
  });

  it("refuses an id in use and an Entry id of another Transaction", async () => {
    const { id, entryId } = await recordExpense();
    await expectRefused(
      expense({ id }),
      "invalid",
      "The transaction already exists",
    );
    await expectRefused(
      expense({
        entries: [{ id: entryId, accountId: home.currentId, amountMinor: -1 }],
      }),
      "forbidden",
      "An entry id belongs elsewhere",
    );
  });
});

describe("updateTransaction", () => {
  it("replaces the Entries and Tags", async () => {
    const { id, entryId } = await recordExpense();
    const rows = rowsOf(
      await expectSame(
        mutation("updateTransaction", {
          id,
          patch: {
            entries: [
              { id: randomUUID(), accountId: home.cardId, amountMinor: -900 },
            ],
            tagIds: [],
          },
        }),
      ),
    );
    expect(rows.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: entryId, deletedAt: "set" }),
      ]),
    );
    expect(rows.transactionTags).toEqual([
      expect.objectContaining({ deletedAt: "set" }),
    ]);
  });

  it("moves the Entries to the new date", async () => {
    const { id } = await recordExpense();
    const rows = rowsOf(
      await expectSame(
        mutation("updateTransaction", { id, patch: { date: "2026-09-30" } }),
      ),
    );
    expect(rows.entries).toEqual([
      expect.objectContaining({ date: "2026-09-30" }),
    ]);
  });

  it("lets a Transaction whose Category was deleted be edited", async () => {
    const { id } = await recordExpense();
    await db
      .update(categories)
      .set({ deletedAt: NOW })
      .where(eq(categories.id, home.groceriesId));
    await expectSame(
      mutation("updateTransaction", { id, patch: { note: "Old shop" } }),
    );
    await expectSame(
      mutation("updateTransaction", {
        id,
        patch: { kind: "expense", categoryId: home.groceriesId },
      }),
    );
  });

  it("gives the labels of an AI Transaction to the Member who relabels it", async () => {
    const { id } = await recordExpense();
    await db
      .update(transactions)
      .set({ labelledBy: "ai", aiReason: "Grocer", source: "bank" })
      .where(eq(transactions.id, id));
    const dateOnly = rowsOf(
      await expectSame(
        mutation("updateTransaction", { id, patch: { date: "2026-10-06" } }),
      ),
    );
    expect(dateOnly.transactions).toEqual([
      expect.objectContaining({ labelledBy: "ai" }),
    ]);
    await db
      .update(transactions)
      .set({ needsReview: true })
      .where(eq(transactions.id, id));
    const reviewed = rowsOf(
      await expectSame(
        mutation("updateTransaction", { id, patch: { needsReview: false } }),
      ),
    );
    expect(reviewed.transactions).toEqual([
      expect.objectContaining({ labelledBy: "member" }),
    ]);
    await db
      .update(transactions)
      .set({ labelledBy: "ai" })
      .where(eq(transactions.id, id));
    const relabelled = rowsOf(
      await expectSame(
        mutation("updateTransaction", {
          id,
          patch: { payeeId: home.employerId },
        }),
      ),
    );
    expect(relabelled.transactions).toEqual([
      expect.objectContaining({ labelledBy: "member" }),
    ]);
  });

  it("refuses a deleted Transaction", async () => {
    const { id } = await recordExpense();
    await push(mutation("deleteTransaction", { id }));
    await expectRefused(
      mutation("updateTransaction", { id, patch: { note: "Late" } }),
      "deleted",
      "deleted",
    );
  });
});

describe("deleteTransaction and restoreTransaction", () => {
  it("delete the Transaction with its Entries, and bring back the Entries deleted with it", async () => {
    const { id } = await recordExpense();
    const deleted = rowsOf(
      await expectSame(mutation("deleteTransaction", { id })),
    );
    expect(deleted.entries).toEqual([
      expect.objectContaining({ deletedAt: "set" }),
    ]);
    expect(
      rowsOf(await expectSame(mutation("deleteTransaction", { id }))),
    ).toEqual({});

    const restored = rowsOf(
      await expectSame(mutation("restoreTransaction", { id })),
    );
    expect(restored.entries).toEqual([
      expect.objectContaining({ deletedAt: null }),
    ]);
  });

  it("refuses an unknown Transaction on the server, which the browser waits for", async () => {
    const { browser, server } = await onBothSides(
      mutation("restoreTransaction", { id: randomUUID() }),
    );
    expect(server).toEqual({ reason: "not_found", message: "not_found" });
    expect(browser).toBe("waits");
  });
});

describe("confirmExpected and skipExpected", () => {
  it("confirm an Expected Transaction on the bank's day", async () => {
    const { id } = await recordExpense({ status: "expected" });
    const rows = rowsOf(
      await expectSame(
        mutation("confirmExpected", { id, patch: { date: "2026-10-07" } }),
      ),
    );
    expect(rows.transactions).toEqual([
      expect.objectContaining({ status: "posted", date: "2026-10-07" }),
    ]);
    expect(
      rowsOf(await expectSame(mutation("confirmExpected", { id }))),
    ).toEqual({});
  });

  it("skip an Expected Transaction, and refuse to skip a confirmed one", async () => {
    const { id } = await recordExpense({ status: "expected" });
    const posted = await recordExpense();
    rowsOf(await expectSame(mutation("skipExpected", { id })));
    await expectRefused(
      mutation("skipExpected", { id: posted.id }),
      "invalid",
      "The transaction is confirmed already",
    );
  });
});
