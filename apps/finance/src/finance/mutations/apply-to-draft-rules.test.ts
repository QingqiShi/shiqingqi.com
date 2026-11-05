import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { bankLinks, bankTransactions, connections } from "../db/schema.ts";
import { mutation } from "../db/testing/mutation.ts";
import { occurrenceId } from "../rules/occurrence-id.ts";
import {
  db,
  expectRefused,
  expectSame,
  home,
  NOW,
  onBothSides,
  push,
  rowsOf,
  setUpDraftTestHousehold,
  TODAY,
  type Input,
} from "./test-apply-to-draft.ts";

setUpDraftTestHousehold();

describe("upsertRule", () => {
  /** A split weekly Rule from today, whose Expected Transactions are 2026-10-10 and 2026-10-17. */
  function splitTemplate(
    amounts: [number, number] = [-600, -400],
    categoryId = home.groceriesId,
  ) {
    return {
      kind: "expense" as const,
      categoryId,
      payeeId: home.grocerId,
      entries: [
        { accountId: home.currentId, amountMinor: amounts[0] },
        { accountId: home.cardId, amountMinor: amounts[1] },
      ],
    };
  }

  function newRule(id: string) {
    return mutation("upsertRule", {
      id,
      name: "Weekly shop",
      unit: "week",
      startsOn: TODAY,
      template: splitTemplate(),
    });
  }

  it("adds the Rule row on both sides; only the server makes its Expected Transactions", async () => {
    const ruleId = randomUUID();
    const { browser, server } = await onBothSides(newRule(ruleId));
    const [rule] = rowsOf(server).rules ?? [];
    // Materialise moves `nextOn` past the days it made, after the mutation.
    expect(rowsOf(browser)).toEqual({
      rules: [{ ...rule, nextOn: TODAY }],
    });
    expect(
      rowsOf(server)
        .transactions?.map((row) => row.id)
        .sort(),
    ).toEqual(
      [
        occurrenceId(ruleId, "2026-10-10"),
        occurrenceId(ruleId, "2026-10-17"),
      ].sort(),
    );
  });

  it("saves only the Rule row in the browser; the server makes the Expected Transactions follow the template, but a bank-backed one", async () => {
    const ruleId = randomUUID();
    await push(newRule(ruleId));
    const backedId = occurrenceId(ruleId, "2026-10-17");
    const connectionId = randomUUID();
    const linkId = randomUUID();
    await db.insert(connections).values({
      id: connectionId,
      householdId: home.householdId,
      label: "Lunch Flow",
      version: 1,
    });
    await db.insert(bankLinks).values({
      id: linkId,
      householdId: home.householdId,
      connectionId,
      accountId: home.currentId,
      providerAccountId: "provider-current",
      currency: "GBP",
      version: 1,
    });
    await db.insert(bankTransactions).values({
      id: randomUUID(),
      householdId: home.householdId,
      linkId,
      providerTxId: "provider-tx",
      date: "2026-10-17",
      amountMinor: -600,
      currency: "GBP",
      raw: {},
      transactionId: backedId,
      version: 1,
    });

    const { browser, server } = await onBothSides(
      mutation("upsertRule", {
        id: ruleId,
        template: splitTemplate([-700, -300]),
      }),
    );

    const serverRows = rowsOf(server);
    expect(rowsOf(browser)).toEqual({ rules: serverRows.rules });
    expect(serverRows.transactions).toEqual([
      expect.objectContaining({ id: occurrenceId(ruleId, "2026-10-10") }),
    ]);
    expect(
      serverRows.entries?.map(
        ({ transactionId, position, accountId, amountMinor }) => ({
          transactionId,
          position,
          accountId,
          amountMinor,
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        {
          transactionId: occurrenceId(ruleId, "2026-10-10"),
          position: 0,
          accountId: home.currentId,
          amountMinor: -700,
        },
        {
          transactionId: occurrenceId(ruleId, "2026-10-10"),
          position: 1,
          accountId: home.cardId,
          amountMinor: -300,
        },
      ]),
    );
    expect(serverRows.entries).toHaveLength(2);
  });

  it("deletes the Rule with its Expected Transactions on both sides", async () => {
    const ruleId = randomUUID();
    await push(newRule(ruleId));
    const rows = rowsOf(
      await expectSame(mutation("upsertRule", { id: ruleId, deleted: true })),
    );
    expect(rows.transactions).toEqual([
      expect.objectContaining({ deletedAt: "set" }),
      expect.objectContaining({ deletedAt: "set" }),
    ]);
  });

  async function linkAccount(accountId: string, deletedAt: Date | null = null) {
    const connectionId = randomUUID();
    await db.insert(connections).values({
      id: connectionId,
      householdId: home.householdId,
      label: "Lunch Flow",
      version: 1,
    });
    await db.insert(bankLinks).values({
      id: randomUUID(),
      householdId: home.householdId,
      connectionId,
      accountId,
      providerAccountId: `provider-${randomUUID()}`,
      currency: "GBP",
      version: 1,
      deletedAt,
    });
  }

  async function expectAutoPost(input: Input, autoPost: boolean) {
    const { browser, server } = await onBothSides(input);
    for (const outcome of [browser, server]) {
      expect(rowsOf(outcome).rules).toEqual([
        expect.objectContaining({ autoPost }),
      ]);
    }
  }

  it("makes a new Rule on an account with a Bank link make Expected Transactions, though it asks to post automatically", async () => {
    await linkAccount(home.cardId);
    await expectAutoPost(
      mutation("upsertRule", { ...newRule(randomUUID()).args, autoPost: true }),
      false,
    );
  });

  it("stops a Rule that posts automatically when a change comes after its account got a Bank link", async () => {
    const ruleId = randomUUID();
    await push(
      mutation("upsertRule", {
        ...newRule(ruleId).args,
        autoPost: true,
        template: {
          ...splitTemplate(),
          entries: [{ accountId: home.savingsId, amountMinor: -1_000 }],
        },
      }),
    );
    await linkAccount(home.currentId);
    await expectAutoPost(
      mutation("upsertRule", { id: ruleId, template: splitTemplate() }),
      false,
    );
    await linkAccount(home.savingsId);
    await expectAutoPost(
      mutation("upsertRule", { id: ruleId, name: "Big shop" }),
      false,
    );
  });

  it("posts automatically on an account whose Bank link is deleted", async () => {
    await linkAccount(home.currentId, NOW);
    await expectAutoPost(
      mutation("upsertRule", { ...newRule(randomUUID()).args, autoPost: true }),
      true,
    );
  });

  it("refuses another kind and an unknown Category in the template", async () => {
    const ruleId = randomUUID();
    await push(newRule(ruleId));
    await expectRefused(
      mutation("upsertRule", {
        id: ruleId,
        template: {
          kind: "transfer",
          entries: [
            { accountId: home.currentId, amountMinor: -1_000 },
            { accountId: home.cardId, amountMinor: 1_000 },
          ],
        },
      }),
      "invalid",
      "A rule keeps its kind",
    );
    await expectRefused(
      mutation("upsertRule", {
        id: ruleId,
        template: splitTemplate([-600, -400], randomUUID()),
      }),
      "invalid",
      "Unknown category",
    );
  });
});
