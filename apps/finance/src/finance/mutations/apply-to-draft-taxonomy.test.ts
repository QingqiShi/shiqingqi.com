import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { accounts, categories, valuations } from "../db/schema.ts";
import { mutation } from "../db/testing/mutation.ts";
import {
  db,
  expectRefused,
  expectSame,
  home,
  onBothSides,
  push,
  recordExpense,
  rowsOf,
  setUpDraftTestHousehold,
} from "./test-apply-to-draft.ts";

setUpDraftTestHousehold();

describe("putValuation and deleteValuation", () => {
  function valuation(fields: Record<string, unknown> = {}) {
    return mutation("putValuation", {
      id: randomUUID(),
      accountId: home.currentId,
      on: "2026-10-06",
      amountMinor: 10_000,
      ...fields,
    });
  }

  it("add a Valuation, and write nothing for the balance the account has", async () => {
    await recordExpense();
    rowsOf(await expectSame(valuation()));
    expect(
      rowsOf(await expectSame(valuation({ amountMinor: 10_000 }))),
    ).toEqual({});
    expect(
      rowsOf(
        await expectSame(valuation({ on: "2026-10-08", amountMinor: 10_000 })),
      ),
    ).toEqual({});
  });

  it("replace a Valuation of the bank on the same day with the Member's", async () => {
    const id = randomUUID();
    await db.insert(valuations).values({
      id,
      householdId: home.householdId,
      accountId: home.currentId,
      on: "2026-10-06",
      amountMinor: 5_000,
      source: "bank",
      version: 1,
    });
    const rows = rowsOf(await expectSame(valuation({ note: "Statement" })));
    expect(rows.valuations).toEqual([
      expect.objectContaining({ id, amountMinor: 10_000, source: "manual" }),
    ]);
  });

  it.each([
    ["that pulled each change", false],
    ["bootstrapped after the delete", true],
  ])(
    "add a new Valuation on a day whose Valuation was deleted, on a Replica %s, and undo it",
    async (_name, fresh) => {
      const first = valuation();
      await push(first);
      await push(mutation("deleteValuation", { id: first.args.id }));
      const second = valuation({ amountMinor: 7_000 });
      const rows = rowsOf(await expectSame(second, { fresh }));
      expect(rows.valuations).toEqual([
        expect.objectContaining({
          id: second.args.id,
          amountMinor: 7_000,
          deletedAt: null,
        }),
      ]);
      const undone = rowsOf(
        await expectSame(mutation("deleteValuation", { id: second.args.id }), {
          fresh,
        }),
      );
      expect(undone.valuations).toEqual([
        expect.objectContaining({ id: second.args.id, deletedAt: "set" }),
      ]);
      const day = await db
        .select({ id: valuations.id, deletedAt: valuations.deletedAt })
        .from(valuations)
        .where(eq(valuations.on, "2026-10-06"));
      expect(day).toHaveLength(2);
      expect(day.every((row) => row.deletedAt !== null)).toBe(true);
    },
  );

  it("bring back a deleted Valuation under its own id, as an undo of its delete does", async () => {
    const first = valuation();
    await push(first);
    await push(mutation("deleteValuation", { id: first.args.id }));
    const rows = rowsOf(
      await expectSame(valuation({ id: first.args.id, amountMinor: 7_000 })),
    );
    expect(rows.valuations).toEqual([
      expect.objectContaining({
        id: first.args.id,
        amountMinor: 7_000,
        deletedAt: null,
      }),
    ]);
  });

  it("refuse the id of a Valuation on another day", async () => {
    const first = valuation();
    await push(first);
    await push(mutation("deleteValuation", { id: first.args.id }));
    await expectRefused(
      valuation({ id: first.args.id, on: "2026-10-07" }),
      "invalid",
      "The valuation id is in use",
    );
  });

  it("refuse a Valuation on In transit", async () => {
    await db
      .update(accounts)
      .set({ isSystem: true })
      .where(eq(accounts.id, home.savingsId));
    await expectRefused(
      valuation({ accountId: home.savingsId }),
      "invalid",
      "In transit takes no Valuation",
    );
  });
});

describe("upsertAccount and upsertGroup", () => {
  it("refuse to delete an account in use, and delete one that is not", async () => {
    await recordExpense();
    await expectRefused(
      mutation("upsertAccount", { id: home.currentId, deleted: true }),
      "invalid",
      "Transactions, valuations or a Bank link still use the account; close it",
    );
    rowsOf(
      await expectSame(
        mutation("upsertAccount", { id: home.savingsId, deleted: true }),
      ),
    );
  });

  it.each([
    [
      "a group of the other side",
      {
        id: randomUUID(),
        name: "Mortgage",
        kind: "loan" as const,
        currency: "GBP",
      },
      "A loan account cannot go in a asset group",
    ],
    [
      "a currency the ECB publishes no rate for",
      {
        id: randomUUID(),
        name: "Wallet",
        kind: "cash" as const,
        currency: "XYZ",
      },
      "Finance supports only the currencies the ECB publishes rates for",
    ],
  ])("refuse %s", async (_name, fields, message) => {
    await expectRefused(
      mutation("upsertAccount", { groupId: home.liquidGroupId, ...fields }),
      "invalid",
      message,
    );
  });

  it("let a Member only move In transit", async () => {
    await db
      .update(accounts)
      .set({ isSystem: true })
      .where(eq(accounts.id, home.savingsId));
    rowsOf(
      await expectSame(
        mutation("upsertAccount", { id: home.savingsId, position: 5 }),
      ),
    );
    await expectRefused(
      mutation("upsertAccount", { id: home.savingsId, name: "Float" }),
      "invalid",
      "In transit can only be moved",
    );
  });

  it("add a Group, and refuse to delete one that holds accounts or to give it the other side", async () => {
    rowsOf(
      await expectSame(
        mutation("upsertGroup", {
          id: randomUUID(),
          name: "Pots",
          side: "asset",
        }),
      ),
    );
    await expectRefused(
      mutation("upsertGroup", { id: home.liquidGroupId, deleted: true }),
      "invalid",
      "The group still holds accounts",
    );
    await expectRefused(
      mutation("upsertGroup", { id: home.liquidGroupId, side: "liability" }),
      "invalid",
      "The group holds accounts of the other side",
    );
  });
});

describe("upsertCategory", () => {
  it("renames a Category and the search text of its Transactions", async () => {
    await recordExpense();
    const rows = rowsOf(
      await expectSame(
        mutation("upsertCategory", { id: home.groceriesId, name: "Food" }),
      ),
    );
    expect(rows.transactions).toEqual([
      expect.objectContaining({ searchText: "grocer food" }),
    ]);
  });

  it("refuses to delete a Category in use, and deletes it once its Transactions are gone", async () => {
    const { id } = await recordExpense();
    await expectRefused(
      mutation("upsertCategory", { id: home.groceriesId, deleted: true }),
      "invalid",
      "Transactions or subcategories still use the category; archive it",
    );
    await push(mutation("deleteTransaction", { id }));
    rowsOf(
      await expectSame(
        mutation("upsertCategory", { id: home.groceriesId, deleted: true }),
      ),
    );
  });

  it("refuses to delete a system Category or to make a Category its own parent", async () => {
    const systemId = randomUUID();
    await db.insert(categories).values({
      id: systemId,
      householdId: home.householdId,
      kind: "expense",
      name: "Uncategorised",
      isSystem: true,
      version: 0,
    });
    const { browser, server } = await onBothSides(
      mutation("upsertCategory", { id: systemId, deleted: true }),
    );
    expect(server).toMatchObject({ reason: "invalid" });
    expect(browser).toEqual(server);
    await expectRefused(
      mutation("upsertCategory", {
        id: home.groceriesId,
        parentId: home.groceriesId,
      }),
      "invalid",
      "A category cannot be its own parent",
    );
  });
});

describe("upsertPayee and mergePayee", () => {
  it("move the Transactions and Rule templates of a merged Payee, and refuse to change it after", async () => {
    const shopId = randomUUID();
    const ruleId = randomUUID();
    await push(mutation("upsertPayee", { id: shopId, name: "Corner Shop" }));
    await recordExpense({ payeeId: shopId });
    await push(
      mutation("upsertRule", {
        id: ruleId,
        name: "Milk",
        unit: "month",
        startsOn: "2026-12-01",
        template: {
          kind: "expense",
          categoryId: home.groceriesId,
          payeeId: shopId,
          entries: [{ accountId: home.currentId, amountMinor: -100 }],
        },
      }),
    );
    const rows = rowsOf(
      await expectSame(
        mutation("mergePayee", { fromId: shopId, intoId: home.grocerId }),
      ),
    );
    expect(rows.transactions).toEqual([
      expect.objectContaining({
        payeeId: home.grocerId,
        searchText: "grocer groceries",
      }),
    ]);
    expect(rows.rules).toMatchObject([
      { template: { payeeId: home.grocerId } },
    ]);
    await expectRefused(
      mutation("upsertPayee", { id: shopId, name: "Again" }),
      "deleted",
      "The payee was merged",
    );
  });
});
