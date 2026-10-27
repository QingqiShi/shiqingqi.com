import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  accountBalanceDays,
  bankLinks,
  bankTransactions,
  categories,
  connections,
  entries,
  households,
  rules,
  transactions,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import { materialiseRules } from "./materialise-rules.ts";
import { occurrenceEntryId, occurrenceId } from "./rule-occurrences.ts";

let db: TestDb;
let home: SeededHousehold;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
});

afterEach(async () => {
  await db.close();
});

async function createRule(
  fields: Record<string, unknown>,
  now = new Date("2026-01-25T12:00:00Z"),
) {
  const id = randomUUID();
  await push(
    "upsertRule",
    {
      id,
      name: "Rent",
      unit: "month",
      startsOn: "2026-01-31",
      template: {
        kind: "expense",
        categoryId: home.groceriesId,
        payeeId: home.grocerId,
        entries: [{ accountId: home.currentId, amountMinor: -120_000 }],
      },
      ...fields,
    },
    now,
  );
  return id;
}

async function push(name: string, args: Record<string, unknown>, now: Date) {
  const result = await applyMutations(
    db,
    home.householdId,
    { clientId: randomUUID(), mutations: [{ id: randomUUID(), name, args }] },
    now,
  );
  expect(result.rejected).toEqual([]);
}

function balanceDays() {
  return db
    .select({
      day: accountBalanceDays.day,
      balanceMinor: accountBalanceDays.balanceMinor,
    })
    .from(accountBalanceDays);
}

/** An Expected Transaction of the Rule whose id is not the one Materialise gives. */
async function insertImported(
  ruleId: string,
  date: string,
  fields: { id?: string; deletedAt?: Date } = {},
) {
  const id = fields.id ?? randomUUID();
  await db.insert(transactions).values({
    id,
    householdId: home.householdId,
    kind: "expense",
    status: "expected",
    date,
    categoryId: home.groceriesId,
    payeeId: home.grocerId,
    ruleId,
    source: "import",
    version: 1,
    deletedAt: fields.deletedAt ?? null,
  });
  await db.insert(entries).values({
    id: randomUUID(),
    householdId: home.householdId,
    transactionId: id,
    accountId: home.currentId,
    date,
    amountMinor: -120_000,
    version: 1,
    deletedAt: fields.deletedAt ?? null,
  });
  return id;
}

async function ruleDays(ruleId: string) {
  return (await ruleTransactions(ruleId)).map((row) => row.date);
}

function ruleTransactions(ruleId: string) {
  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      status: transactions.status,
    })
    .from(transactions)
    .where(and(eq(transactions.ruleId, ruleId), isNull(transactions.deletedAt)))
    .orderBy(asc(transactions.date));
}

describe("a schedule change", () => {
  it("keeps one Expected per occurrence when the schedule changes", async () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1, nextOn: "2026-11-01" },
      now,
    );
    expect(await ruleDays(ruleId)).toEqual(["2026-11-01"]);

    await push("upsertRule", { id: ruleId, nonBusinessDay: "next" }, now);
    expect(await ruleDays(ruleId)).toEqual(["2026-11-02"]);

    await push("upsertRule", { id: ruleId, nonBusinessDay: "previous" }, now);
    expect(await ruleDays(ruleId)).toEqual(["2026-10-30"]);

    await push("upsertRule", { id: ruleId, nonBusinessDay: "stay" }, now);
    expect(await ruleDays(ruleId)).toEqual(["2026-11-01"]);

    await push("upsertRule", { id: ruleId, nonBusinessDay: "next" }, now);
    expect(await ruleDays(ruleId)).toEqual(["2026-11-02"]);
  });

  it("keeps a skipped occurrence skipped when the schedule keeps its day", async () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1, nextOn: "2026-11-01" },
      now,
    );
    await push("skipExpected", { id: occurrenceId(ruleId, "2026-11-01") }, now);

    await push("upsertRule", { id: ruleId, startsOn: "2026-09-01" }, now);

    expect(await ruleDays(ruleId)).toEqual([]);
  });

  it("leaves past Expected transactions alone when the schedule changes", async () => {
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1 },
      new Date("2026-09-28T12:00:00Z"),
    );
    expect(await ruleDays(ruleId)).toEqual(["2026-10-01"]);

    await push(
      "upsertRule",
      { id: ruleId, nonBusinessDay: "next" },
      new Date("2026-10-26T12:00:00Z"),
    );

    expect(await ruleDays(ruleId)).toEqual(["2026-10-01", "2026-11-02"]);
  });

  it("adds no second occurrence next to an imported one when the schedule changes", async () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1, nextOn: "2026-12-01" },
      now,
    );
    const importedId = await insertImported(ruleId, "2026-11-01");

    await push("upsertRule", { id: ruleId, startsOn: "2026-09-01" }, now);

    expect(await ruleTransactions(ruleId)).toEqual([
      { id: importedId, date: "2026-11-01", status: "expected" },
    ]);
  });

  it("adds no second occurrence next to an imported one when the rule resumes", async () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const ruleId = await createRule(
      {
        startsOn: "2026-10-01",
        dayOfMonth: 1,
        nextOn: "2026-12-01",
        paused: true,
      },
      now,
    );
    const importedId = await insertImported(ruleId, "2026-11-01");

    await push("upsertRule", { id: ruleId, paused: false }, now);

    expect(await ruleTransactions(ruleId)).toEqual([
      { id: importedId, date: "2026-11-01", status: "expected" },
    ]);
  });

  it("posts an imported auto_post occurrence once when the rule resumes on its day", async () => {
    const now = new Date("2026-11-01T12:00:00Z");
    const ruleId = await createRule(
      {
        startsOn: "2026-10-01",
        dayOfMonth: 1,
        nextOn: "2026-12-01",
        autoPost: true,
        paused: true,
      },
      new Date("2026-10-26T12:00:00Z"),
    );
    const importedId = await insertImported(ruleId, "2026-11-01");

    await push("upsertRule", { id: ruleId, paused: false }, now);

    expect(await ruleTransactions(ruleId)).toEqual([
      { id: importedId, date: "2026-11-01", status: "posted" },
    ]);
    expect(await balanceDays()).toEqual([
      { day: "2026-11-01", balanceMinor: -120_000 },
    ]);
  });

  it("does not bring back a skipped imported occurrence when the schedule changes", async () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1, nextOn: "2026-12-01" },
      now,
    );
    const importedId = await insertImported(ruleId, "2026-11-01");
    await push("skipExpected", { id: importedId }, now);

    await push("upsertRule", { id: ruleId, startsOn: "2026-09-01" }, now);

    expect(await ruleTransactions(ruleId)).toEqual([]);
  });

  it("does not bring back an occurrence that Bank sync confirmed on another day", async () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1, nextOn: "2026-11-01" },
      now,
    );
    const id = occurrenceId(ruleId, "2026-11-01");
    await push("confirmExpected", { id, patch: { date: "2026-10-30" } }, now);

    await push("upsertRule", { id: ruleId, startsOn: "2026-09-01" }, now);

    expect(await ruleTransactions(ruleId)).toEqual([
      { id, date: "2026-10-30", status: "posted" },
    ]);
  });

  it("creates the occurrence of a day that a moved occurrence now has", async () => {
    const now = new Date("2026-10-28T12:00:00Z");
    const ruleId = await createRule(
      { unit: "week", startsOn: "2026-10-27", nextOn: "2026-12-01" },
      now,
    );
    const movedId = await insertImported(ruleId, "2026-11-03", {
      id: occurrenceId(ruleId, "2026-10-27"),
    });
    await db.update(rules).set({ nextOn: "2026-10-27" });

    await materialiseRules(db, home.householdId, now);

    const rows = await ruleTransactions(ruleId);
    expect(rows.map((row) => row.id).sort()).toEqual(
      [movedId, occurrenceId(ruleId, "2026-11-03")].sort(),
    );
    expect(rows.map((row) => row.date)).toEqual(["2026-11-03", "2026-11-03"]);
  });

  it("restores one occurrence for a day that has two deleted ones", async () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1, nextOn: "2026-12-01" },
      now,
    );
    await insertImported(ruleId, "2026-11-01");
    await insertImported(ruleId, "2026-11-01", {
      id: occurrenceId(ruleId, "2026-11-01"),
      deletedAt: new Date("2026-10-20T12:00:00Z"),
    });

    await push("upsertRule", { id: ruleId, nonBusinessDay: "next" }, now);
    expect(await ruleDays(ruleId)).toEqual(["2026-11-02"]);

    await push("upsertRule", { id: ruleId, nonBusinessDay: "stay" }, now);
    expect(await ruleDays(ruleId)).toEqual(["2026-11-01"]);
  });
});

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

  it("changes nothing when the template stays the same", async () => {
    const { ruleId, occurrence } = await ruleWithOccurrence();
    const version = () =>
      db
        .select({ version: transactions.version })
        .from(transactions)
        .where(eq(transactions.id, occurrence));
    const before = await version();

    await push("upsertRule", { id: ruleId, template: template({}) }, now);

    expect(await version()).toEqual(before);
  });

  it("gives an occurrence that a schedule change restores the new template", async () => {
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1, nextOn: "2026-11-01" },
      now,
    );
    await push("upsertRule", { id: ruleId, nonBusinessDay: "next" }, now);
    expect(await ruleDays(ruleId)).toEqual(["2026-11-02"]);
    const diningId = await addDining();

    await push(
      "upsertRule",
      { id: ruleId, nonBusinessDay: "stay", template: newTemplate(diningId) },
      now,
    );

    expect(await ruleDays(ruleId)).toEqual(["2026-11-01"]);
    expect(await shape(occurrenceId(ruleId, "2026-11-01"))).toMatchObject({
      categoryId: diningId,
      entries: [{ accountId: home.cardId, amountMinor: -150_000 }],
    });
  });
});

describe("a bank-backed Transaction on an occurrence's day", () => {
  const now = new Date("2026-01-25T12:00:00Z");
  let linkId: string | undefined;

  beforeEach(() => {
    linkId = undefined;
  });

  async function currentAccountLink() {
    if (linkId) return linkId;
    const connectionId = randomUUID();
    linkId = randomUUID();
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
    return linkId;
  }

  /** A posted payment from the current account, matched to a bank row of it unless `backed` is false. */
  async function recordPayment(
    date: string,
    { amountMinor = -120_000, backed = true } = {},
  ) {
    const id = randomUUID();
    await push(
      "createTransaction",
      {
        id,
        kind: "expense",
        date,
        categoryId: home.groceriesId,
        entries: [{ id: randomUUID(), accountId: home.currentId, amountMinor }],
      },
      now,
    );
    if (backed) {
      await db.insert(bankTransactions).values({
        id: randomUUID(),
        householdId: home.householdId,
        linkId: await currentAccountLink(),
        providerTxId: randomUUID(),
        date,
        amountMinor,
        currency: "GBP",
        raw: {},
        state: "matched",
        transactionId: id,
        version: 1,
      });
    }
    return id;
  }

  async function transaction(id: string) {
    const [row] = await db
      .select({
        ruleId: transactions.ruleId,
        date: transactions.date,
        status: transactions.status,
        categoryId: transactions.categoryId,
        payeeId: transactions.payeeId,
        version: transactions.version,
      })
      .from(transactions)
      .where(eq(transactions.id, id));
    return row;
  }

  it("gives the Transaction the Rule and creates no occurrence", async () => {
    const paymentId = await recordPayment("2026-01-31");
    const before = await transaction(paymentId);

    const ruleId = await createRule({}, now);

    expect(await ruleTransactions(ruleId)).toEqual([
      { id: paymentId, date: "2026-01-31", status: "posted" },
    ]);
    const [household] = await db.select().from(households);
    expect(await transaction(paymentId)).toEqual({
      ...before,
      ruleId,
      version: household.clock,
    });
  });

  it.each(["2026-01-28", "2026-02-01", "2026-02-03"])(
    "gives the Rule a Transaction dated %s, within three days",
    async (date) => {
      const paymentId = await recordPayment(date);

      const ruleId = await createRule({}, now);

      expect(await ruleTransactions(ruleId)).toEqual([
        { id: paymentId, date, status: "posted" },
      ]);
    },
  );

  it.each([
    { date: "2026-01-27", amountMinor: -120_000, backed: true },
    { date: "2026-02-04", amountMinor: -120_000, backed: true },
    { date: "2026-01-31", amountMinor: -119_999, backed: true },
    { date: "2026-01-31", amountMinor: -120_000, backed: false },
  ])(
    "creates the occurrence next to $date, $amountMinor, backed: $backed",
    async ({ date, ...fields }) => {
      const paymentId = await recordPayment(date, fields);

      const ruleId = await createRule({}, now);

      expect(await ruleTransactions(ruleId)).toEqual([
        {
          id: occurrenceId(ruleId, "2026-01-31"),
          date: "2026-01-31",
          status: "expected",
        },
      ]);
      expect((await transaction(paymentId)).ruleId).toBeNull();
    },
  );

  it("posts nothing twice for a Rule that posts automatically", async () => {
    const paymentId = await recordPayment("2026-01-31");
    const ruleId = await createRule(
      { autoPost: true, startsOn: "2026-02-01", dayOfMonth: 1 },
      new Date("2026-01-31T12:00:00Z"),
    );

    await materialiseRules(
      db,
      home.householdId,
      new Date("2026-02-01T08:00:00Z"),
    );

    expect(await ruleTransactions(ruleId)).toEqual([
      { id: paymentId, date: "2026-01-31", status: "posted" },
    ]);
    expect(await balanceDays()).toEqual([
      { day: "2026-01-31", balanceMinor: -120_000 },
    ]);
  });

  it("gives one Transaction to one Rule only", async () => {
    const paymentId = await recordPayment("2026-01-31");

    const firstId = await createRule({}, now);
    const secondId = await createRule({ name: "Rent again" }, now);

    expect(await ruleTransactions(firstId)).toEqual([
      { id: paymentId, date: "2026-01-31", status: "posted" },
    ]);
    expect(await ruleTransactions(secondId)).toEqual([
      {
        id: occurrenceId(secondId, "2026-01-31"),
        date: "2026-01-31",
        status: "expected",
      },
    ]);
  });

  it("gives each of two Rules with the same amount its own Transaction", async () => {
    const paymentIds = [
      await recordPayment("2026-01-31"),
      await recordPayment("2026-01-31"),
    ];

    const ruleIds = [
      await createRule({}, now),
      await createRule({ name: "Rent again" }, now),
    ];

    const adopted = await db
      .select({ id: transactions.id, ruleId: transactions.ruleId })
      .from(transactions)
      .where(isNull(transactions.deletedAt));
    expect(adopted).toHaveLength(2);
    expect(adopted.map((row) => row.id).sort()).toEqual(paymentIds.sort());
    expect(adopted.map((row) => row.ruleId).sort()).toEqual(ruleIds.sort());
  });

  it("changes no Transaction when it looks at the day again", async () => {
    await recordPayment("2026-02-01");
    const ruleId = await createRule({}, now);
    expect(await materialiseRules(db, home.householdId, now)).toMatchObject({
      written: 0,
    });
    await db.update(rules).set({ nextOn: "2026-01-31" });
    const before = await db.select().from(transactions);

    await materialiseRules(db, home.householdId, now);

    expect(await db.select().from(transactions)).toEqual(before);
    expect(await ruleDays(ruleId)).toEqual(["2026-02-01"]);
  });

  it("adds no occurrence next to the Transaction when the schedule changes", async () => {
    const paymentId = await recordPayment("2026-01-30");
    const ruleId = await createRule({}, now);

    await push(
      "upsertRule",
      { id: ruleId, nonBusinessDay: "next" },
      new Date("2026-01-30T12:00:00Z"),
    );
    await push(
      "upsertRule",
      { id: ruleId, nonBusinessDay: "stay" },
      new Date("2026-01-30T12:00:00Z"),
    );

    expect(await ruleTransactions(ruleId)).toEqual([
      { id: paymentId, date: "2026-01-30", status: "posted" },
    ]);
  });
});
