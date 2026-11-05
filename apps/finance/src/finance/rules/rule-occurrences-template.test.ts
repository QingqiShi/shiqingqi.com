import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  bankLinks,
  bankTransactions,
  categories,
  connections,
  entries,
  transactions,
} from "../db/schema.ts";
import { occurrenceEntryId, occurrenceId } from "./occurrence-id.ts";
import {
  createRule,
  db,
  home,
  insertImported,
  push,
  setUpRuleTestHousehold,
} from "./test-rule-occurrences.ts";

setUpRuleTestHousehold();

describe("a template change", () => {
  const now = new Date("2026-10-26T12:00:00Z");

  async function addDining() {
    const id = randomUUID();
    await db.insert(categories).values({
      id,
      householdId: home.householdId,
      kind: "expense",
      name: "Dining",
      version: 1,
    });
    return id;
  }

  /** Marks the Transaction as matched to a bank row of the current account. */
  async function linkToBankRow(transactionId: string) {
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
      date: "2026-12-01",
      amountMinor: -120_000,
      currency: "GBP",
      raw: {},
      transactionId,
      version: 1,
    });
  }

  async function shape(transactionId: string) {
    const [row] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));
    const live = await db
      .select({
        id: entries.id,
        accountId: entries.accountId,
        amountMinor: entries.amountMinor,
        date: entries.date,
      })
      .from(entries)
      .where(
        and(
          eq(entries.transactionId, transactionId),
          isNull(entries.deletedAt),
        ),
      )
      .orderBy(asc(entries.position));
    return {
      categoryId: row.categoryId,
      payeeId: row.payeeId,
      entries: live,
    };
  }

  function newTemplate(categoryId: string) {
    return {
      kind: "expense",
      categoryId,
      payeeId: home.employerId,
      entries: [{ accountId: home.cardId, amountMinor: -150_000 }],
    };
  }

  it("moves the upcoming Expected transactions to the new account, Payee, Category and amount", async () => {
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1, nextOn: "2026-11-01" },
      now,
    );
    const materialisedId = occurrenceId(ruleId, "2026-11-01");
    const importedId = await insertImported(ruleId, "2026-11-15");
    const pastId = await insertImported(ruleId, "2026-10-20");
    const linkedId = await insertImported(ruleId, "2026-12-01");
    await linkToBankRow(linkedId);
    const confirmedId = await insertImported(ruleId, "2027-01-01");
    await push("confirmExpected", { id: confirmedId }, now);
    const untouched = {
      past: await shape(pastId),
      linked: await shape(linkedId),
      confirmed: await shape(confirmedId),
    };
    const diningId = await addDining();

    await push(
      "upsertRule",
      { id: ruleId, template: newTemplate(diningId) },
      now,
    );

    expect(await shape(materialisedId)).toEqual({
      categoryId: diningId,
      payeeId: home.employerId,
      entries: [
        {
          id: occurrenceEntryId(ruleId, "2026-11-01", 0),
          accountId: home.cardId,
          amountMinor: -150_000,
          date: "2026-11-01",
        },
      ],
    });
    expect(await shape(importedId)).toMatchObject({
      categoryId: diningId,
      payeeId: home.employerId,
      entries: [
        { accountId: home.cardId, amountMinor: -150_000, date: "2026-11-15" },
      ],
    });
    expect({
      past: await shape(pastId),
      linked: await shape(linkedId),
      confirmed: await shape(confirmedId),
    }).toEqual(untouched);
  });

  /** A monthly Rule whose Expected Transaction on 2026-11-01 Materialise made. */
  async function ruleWithOccurrence() {
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1, nextOn: "2026-11-01" },
      now,
    );
    return { ruleId, occurrence: occurrenceId(ruleId, "2026-11-01") };
  }

  function template(fields: Record<string, unknown>) {
    return {
      kind: "expense",
      categoryId: home.groceriesId,
      payeeId: home.grocerId,
      entries: [{ accountId: home.currentId, amountMinor: -120_000 }],
      ...fields,
    };
  }

  it("keeps a field that a Member changed on one Transaction when the template keeps it", async () => {
    const { ruleId, occurrence } = await ruleWithOccurrence();
    await push(
      "updateTransaction",
      { id: occurrence, patch: { note: "Birthday" } },
      now,
    );

    await push(
      "upsertRule",
      { id: ruleId, template: template({ payeeId: home.employerId }) },
      now,
    );

    const [row] = await db
      .select({ note: transactions.note, payeeId: transactions.payeeId })
      .from(transactions)
      .where(eq(transactions.id, occurrence));
    expect(row).toEqual({ note: "Birthday", payeeId: home.employerId });
  });

  it("moves the amount with the account, so that they agree", async () => {
    const { ruleId, occurrence } = await ruleWithOccurrence();
    const [entry] = (await shape(occurrence)).entries;
    await push(
      "updateTransaction",
      {
        id: occurrence,
        patch: {
          entries: [
            { id: entry.id, accountId: home.currentId, amountMinor: -200_000 },
          ],
        },
      },
      now,
    );

    await push(
      "upsertRule",
      {
        id: ruleId,
        template: template({
          entries: [{ accountId: home.cardId, amountMinor: -120_000 }],
        }),
      },
      now,
    );

    expect((await shape(occurrence)).entries).toEqual([
      { ...entry, accountId: home.cardId, amountMinor: -120_000 },
    ]);
  });

  it("leaves a Transaction that a Member gave another kind", async () => {
    const { ruleId, occurrence } = await ruleWithOccurrence();
    await push(
      "updateTransaction",
      {
        id: occurrence,
        patch: {
          kind: "income",
          categoryId: home.salaryId,
          entries: [
            {
              id: randomUUID(),
              accountId: home.currentId,
              amountMinor: 120_000,
            },
          ],
        },
      },
      now,
    );
    const before = await shape(occurrence);
    const diningId = await addDining();

    await push(
      "upsertRule",
      { id: ruleId, template: newTemplate(diningId) },
      now,
    );

    expect(await shape(occurrence)).toEqual(before);
  });

  it("adds an Entry for a position the Transaction has none for", async () => {
    const { ruleId, occurrence } = await ruleWithOccurrence();
    const [entry] = (await shape(occurrence)).entries;

    await push(
      "upsertRule",
      {
        id: ruleId,
        template: template({
          entries: [
            { accountId: home.currentId, amountMinor: -70_000 },
            { accountId: home.cardId, amountMinor: -50_000 },
          ],
        }),
      },
      now,
    );

    expect((await shape(occurrence)).entries).toEqual([
      { ...entry, amountMinor: -70_000 },
      {
        id: occurrenceEntryId(ruleId, "2026-11-01", 1),
        accountId: home.cardId,
        amountMinor: -50_000,
        date: "2026-11-01",
      },
    ]);
  });
});
