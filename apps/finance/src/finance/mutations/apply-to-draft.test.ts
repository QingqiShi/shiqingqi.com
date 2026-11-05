import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mutation } from "../db/testing/mutation.ts";
import type { MutationInput, MutationName } from "../sync/mutation-schema.ts";
import {
  expectSame,
  expense,
  home,
  onBothSides,
  push,
  recordExpense,
  rowsOf,
  setUpDraftTestHousehold,
  TODAY,
} from "./test-apply-to-draft.ts";

setUpDraftTestHousehold();

describe("a Replica that lacks the rows to decide", () => {
  it("waits for the server on a refund of a Transaction deleted before its bootstrap", async () => {
    const original = await recordExpense();
    await push(mutation("deleteTransaction", { id: original.id }));

    const { browser, server } = await onBothSides(
      expense({ refundOfId: original.id }),
      { fresh: true },
    );

    expect(browser).toBe("waits");
    expect(rowsOf(server).transactions).toEqual([
      expect.objectContaining({ refundOfId: original.id }),
    ]);
  });

  it("waits for the server on a Transaction it does not hold", async () => {
    const { id } = await recordExpense();
    await push(mutation("deleteTransaction", { id }));

    const { browser, server } = await onBothSides(
      mutation("deleteTransaction", { id }),
      { fresh: true },
    );

    expect(browser).toBe("waits");
    expect(server).toEqual({ rows: {} });
  });
});

describe("every mutation", () => {
  async function newRuleWithExpected() {
    const id = randomUUID();
    await push(
      mutation("upsertRule", {
        id,
        name: "Weekly shop",
        unit: "week",
        startsOn: TODAY,
        template: {
          kind: "expense",
          categoryId: home.groceriesId,
          payeeId: home.grocerId,
          entries: [
            { accountId: home.currentId, amountMinor: -600 },
            { accountId: home.cardId, amountMinor: -400 },
          ],
        },
      }),
    );
    return id;
  }

  /**
   * For each mutation, a case that reads as much as it can. The server loads
   * only the rows that the mutation declares, so an undeclared read fails.
   */
  const widestCases: {
    [Name in MutationName]: () => Promise<
      Extract<MutationInput, { name: Name }>
    >;
  } = {
    createTransaction: async () =>
      expense({ refundOfId: (await recordExpense()).id }),
    updateTransaction: async () => {
      const { id } = await recordExpense();
      return mutation("updateTransaction", {
        id,
        patch: {
          date: "2026-10-06",
          payeeId: home.employerId,
          memberId: home.partnerId,
          note: "Moved",
          entries: [
            { id: randomUUID(), accountId: home.cardId, amountMinor: -900 },
          ],
          tagIds: [],
        },
      });
    },
    deleteTransaction: async () =>
      mutation("deleteTransaction", { id: (await recordExpense()).id }),
    restoreTransaction: async () => {
      const { id } = await recordExpense();
      await push(mutation("deleteTransaction", { id }));
      return mutation("restoreTransaction", { id });
    },
    confirmExpected: async () => {
      const { id } = await recordExpense({ status: "expected" });
      return mutation("confirmExpected", {
        id,
        patch: {
          date: "2026-10-07",
          entries: [
            { id: randomUUID(), accountId: home.cardId, amountMinor: -1_000 },
          ],
        },
      });
    },
    skipExpected: async () => {
      const { id } = await recordExpense({ status: "expected" });
      return mutation("skipExpected", { id });
    },
    putValuation: async () => {
      await recordExpense();
      return mutation("putValuation", {
        id: randomUUID(),
        accountId: home.currentId,
        on: "2026-10-06",
        amountMinor: 10_000,
      });
    },
    deleteValuation: async () => {
      const id = randomUUID();
      await push(
        mutation("putValuation", {
          id,
          accountId: home.currentId,
          on: "2026-10-06",
          amountMinor: 10_000,
        }),
      );
      return mutation("deleteValuation", { id });
    },
    upsertAccount: () =>
      Promise.resolve(
        mutation("upsertAccount", {
          id: home.savingsId,
          institutionDomain: "wise.com",
          ownerMemberId: home.partnerId,
          defaultPaymentAccountId: home.currentId,
          deleted: true,
        }),
      ),
    upsertGroup: () =>
      Promise.resolve(
        mutation("upsertGroup", {
          id: home.liquidGroupId,
          name: "Cash",
          side: "asset",
        }),
      ),
    upsertCategory: async () => {
      const id = randomUUID();
      await push(
        mutation("upsertCategory", {
          id,
          kind: "expense",
          name: "Bakery",
          parentId: home.groceriesId,
        }),
      );
      return mutation("upsertCategory", { id, deleted: true });
    },
    upsertPayee: () =>
      Promise.resolve(
        mutation("upsertPayee", {
          id: home.grocerId,
          defaultCategoryId: home.groceriesId,
          defaultAccountId: home.currentId,
        }),
      ),
    mergePayee: async () => {
      await recordExpense();
      await newRuleWithExpected();
      return mutation("mergePayee", {
        fromId: home.grocerId,
        intoId: home.employerId,
      });
    },
    upsertTag: () =>
      Promise.resolve(
        mutation("upsertTag", { id: home.trainTagId, name: "Rail" }),
      ),
    upsertMember: () =>
      Promise.resolve(
        mutation("upsertMember", { id: home.memberId, name: "Sam" }),
      ),
    upsertRule: async () =>
      mutation("upsertRule", {
        id: await newRuleWithExpected(),
        autoPost: true,
        deleted: true,
      }),
  };

  it.each(Object.entries(widestCases))(
    "%s reads only the rows it declares, and does the same on both sides",
    async (_name, widestCase) => {
      rowsOf(await expectSame(await widestCase()));
    },
  );
});
