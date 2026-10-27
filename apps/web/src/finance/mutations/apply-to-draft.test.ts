import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  accounts,
  bankLinks,
  bankTransactions,
  categories,
  connections,
  transactions,
  valuations,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { mutation } from "../db/testing/mutation.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { applyLocalMutation } from "../replica/apply-local-mutation.ts";
import { emptyReplicaTables } from "../replica/empty-replica-tables.ts";
import { rowKey } from "../replica/row-key.ts";
import type { ReplicaRow, ReplicaTables } from "../replica/types.ts";
import { occurrenceId } from "../rules/occurrence-id.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import {
  createStrictDraft,
  NotLoadedError,
} from "../sync/create-strict-draft.ts";
import { MutationError } from "../sync/mutation-error.ts";
import {
  mutationSchema,
  type MutationInput,
  type MutationName,
} from "../sync/mutation-schema.ts";
import { pullChanges, readSnapshot, readTable } from "../sync/pull-changes.ts";
import { SYNC_TABLE_NAMES, type SyncTableName } from "../sync/row-schemas.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const TODAY = "2026-10-10";

let db: TestDb;
let home: SeededHousehold;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
});

afterEach(async () => {
  await db.close();
});

type Input = Omit<MutationInput, "id">;

/** The fields that differ only by when and by whom a row was written. */
const STAMPS = new Set(["version", "createdAt", "updatedAt"]);
const MOMENTS = new Set(["deletedAt", "archivedAt", "pausedAt"]);

function normalised(row: object) {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([field]) => !STAMPS.has(field))
      .map(([field, value]) => [
        field,
        MOMENTS.has(field) && value !== null ? "set" : value,
      ]),
  );
}

type Rows = Partial<Record<SyncTableName, Record<string, unknown>[]>>;

function tablesOf(rows: Partial<Record<SyncTableName, readonly object[]>>) {
  const tables: Rows = {};
  for (const table of SYNC_TABLE_NAMES) {
    if (table === "accountBalanceDays") continue;
    const list = rows[table];
    if (!list || list.length === 0) continue;
    tables[table] = list
      .map(normalised)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return tables;
}

async function push(...inputs: Input[]) {
  const result = await applyMutations(
    db,
    home.householdId,
    {
      clientId: randomUUID(),
      mutations: inputs.map((input) => ({ id: randomUUID(), ...input })),
    },
    NOW,
  );
  expect(result.rejected).toEqual([]);
  return result;
}

/**
 * The Replica of the Household: every row, as a Replica that pulled each
 * change has them, or as a new bootstrap has them, without the deleted rows
 * of the tables that grow without bound.
 */
async function replicaTables(fresh: boolean): Promise<ReplicaTables> {
  const tables = emptyReplicaTables();
  await readSnapshot(db, home.householdId, async (scope) => {
    for (const table of SYNC_TABLE_NAMES) {
      const rows = JSON.parse(
        JSON.stringify(await readTable(scope, table, fresh ? null : -1)),
      ) as ReplicaRow<typeof table>[];
      Object.assign(tables, {
        [table]: new Map(rows.map((row) => [rowKey(table, row), row])),
      });
    }
  });
  return tables;
}

type Outcome =
  { rows: Rows } | { reason: string; message: string | undefined } | "waits";

/** Runs one mutation on a Replica of the Household and then on the server, and gives what each did. */
async function onBothSides(
  input: Input,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<{ browser: Outcome; server: Outcome }> {
  const mutation = mutationSchema.parse({ id: randomUUID(), ...input });
  const base = await replicaTables(fresh);
  let browser: Outcome;
  try {
    const { tables, changed, waits } = applyLocalMutation(base, mutation, {
      householdId: home.householdId,
      now: NOW.toISOString(),
      today: TODAY,
      baseCurrency: "GBP",
    });
    browser = waits
      ? "waits"
      : {
          rows: tablesOf(
            Object.fromEntries(
              [...changed].map(([table, keys]) => [
                table,
                [...keys].flatMap((key) => tables[table].get(key) ?? []),
              ]),
            ),
          ),
        };
  } catch (error) {
    if (!(error instanceof MutationError)) throw error;
    browser = { reason: error.reason, message: error.message };
  }

  const clock = (await pullChanges(db, home.householdId, 0)).clock;
  const result = await applyMutations(
    db,
    home.householdId,
    { clientId: randomUUID(), mutations: [mutation] },
    NOW,
  );
  const rejection = result.rejected.at(0);
  const server: Outcome = rejection
    ? { reason: rejection.reason, message: rejection.message }
    : {
        rows: tablesOf(
          JSON.parse(
            JSON.stringify(
              (await pullChanges(db, home.householdId, clock)).tables,
            ),
          ) as Partial<Record<SyncTableName, object[]>>,
        ),
      };
  return { browser, server };
}

async function expectSame(input: Input, options?: { fresh?: boolean }) {
  const { browser, server } = await onBothSides(input, options);
  expect(browser).toEqual(server);
  return server;
}

async function expectRefused(input: Input, reason: string, message: string) {
  const { browser, server } = await onBothSides(input);
  expect(server).toEqual({ reason, message });
  expect(browser).toEqual(server);
}

function rowsOf(outcome: Outcome) {
  if (typeof outcome === "string" || !("rows" in outcome)) {
    throw new Error(`The mutation did not apply: ${JSON.stringify(outcome)}`);
  }
  return outcome.rows;
}

function expense(fields: Record<string, unknown> = {}) {
  return mutation("createTransaction", {
    id: randomUUID(),
    kind: "expense",
    date: "2026-10-05",
    categoryId: home.groceriesId,
    payeeId: home.grocerId,
    memberId: home.memberId,
    entries: [
      { id: randomUUID(), accountId: home.currentId, amountMinor: -1_250 },
    ],
    tagIds: [home.trainTagId],
    ...fields,
  });
}

/** Adds an expense on the server and gives its id and its Entry's id. */
async function recordExpense(fields: Record<string, unknown> = {}) {
  const input = expense(fields);
  await push(input);
  const [entry] = input.args.entries;
  return { id: input.args.id, entryId: entry.id };
}

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

  it("adds a transfer between two accounts", async () => {
    await expectSame(
      mutation("createTransaction", {
        id: randomUUID(),
        kind: "transfer",
        date: "2026-10-05",
        entries: [
          { id: randomUUID(), accountId: home.currentId, amountMinor: -500 },
          { id: randomUUID(), accountId: home.savingsId, amountMinor: 500 },
        ],
      }),
    );
  });

  it.each([
    ["an unknown Category", () => ({ categoryId: randomUUID() })],
    ["a Category of the other kind", () => ({ categoryId: home.salaryId })],
    ["an unknown Payee", () => ({ payeeId: randomUUID() })],
    ["an unknown Member", () => ({ memberId: randomUUID() })],
    ["an unknown Tag", () => ({ tagIds: [randomUUID()] })],
    ["an unknown Rule", () => ({ ruleId: randomUUID() })],
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
  it("changes the note and the search text", async () => {
    const { id } = await recordExpense();
    const rows = rowsOf(
      await expectSame(
        mutation("updateTransaction", { id, patch: { note: "Milk" } }),
      ),
    );
    expect(rows.transactions).toEqual([
      expect.objectContaining({ searchText: "grocer milk groceries" }),
    ]);
  });

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
  it("add an account, as a live one even when it comes deleted", async () => {
    const rows = rowsOf(
      await expectSame(
        mutation("upsertAccount", {
          id: randomUUID(),
          groupId: home.liquidGroupId,
          name: "Joint",
          kind: "cash",
          currency: "EUR",
          deleted: true,
        }),
      ),
    );
    expect(rows.accounts).toEqual([
      expect.objectContaining({ name: "Joint", deletedAt: null }),
    ]);
  });

  it("rename and move an account, and drop its guessed domain with a new institution", async () => {
    await db
      .update(accounts)
      .set({
        institution: "Barclay",
        guessedInstitutionDomain: "barclays.co.uk",
      })
      .where(eq(accounts.id, home.savingsId));
    const rows = rowsOf(
      await expectSame(
        mutation("upsertAccount", {
          id: home.savingsId,
          name: "Rainy day",
          institution: "Wise",
          position: 3,
        }),
      ),
    );
    expect(rows.accounts).toEqual([
      expect.objectContaining({
        name: "Rainy day",
        guessedInstitutionDomain: null,
        institutionIconVersion: null,
      }),
    ]);
  });

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
  it("adds a child Category, archived", async () => {
    const rows = rowsOf(
      await expectSame(
        mutation("upsertCategory", {
          id: randomUUID(),
          kind: "expense",
          name: "Bakery",
          parentId: home.groceriesId,
          archived: true,
        }),
      ),
    );
    expect(rows.categories).toEqual([
      expect.objectContaining({
        archivedAt: "set",
        parentId: home.groceriesId,
      }),
    ]);
  });

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
  it("add and rename a Payee, with the search text of its Transactions", async () => {
    await recordExpense();
    rowsOf(
      await expectSame(
        mutation("upsertPayee", { id: randomUUID(), name: "Corner Shop" }),
      ),
    );
    const rows = rowsOf(
      await expectSame(
        mutation("upsertPayee", { id: home.grocerId, name: "Greengrocer" }),
      ),
    );
    expect(rows.transactions).toEqual([
      expect.objectContaining({ searchText: "greengrocer groceries" }),
    ]);
  });

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

describe("upsertTag and upsertMember", () => {
  it("add and rename a Tag and a Member", async () => {
    const tagId = randomUUID();
    const memberId = randomUUID();
    rowsOf(await expectSame(mutation("upsertTag", { id: tagId, name: "Bus" })));
    rowsOf(
      await expectSame(mutation("upsertTag", { id: tagId, name: "Coach" })),
    );
    const added = rowsOf(
      await expectSame(
        mutation("upsertMember", { id: memberId, name: "Robin" }),
      ),
    );
    expect(added.members).toEqual([
      expect.objectContaining({ role: "member", userId: null }),
    ]);
    expect(
      rowsOf(
        await expectSame(
          mutation("upsertMember", { id: memberId, name: "Robin" }),
        ),
      ),
    ).toEqual({});
  });
});

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

  it("does not post automatically when the stored template has an account with a Bank link", async () => {
    const ruleId = randomUUID();
    await push(newRule(ruleId));
    await linkAccount(home.currentId);
    await expectAutoPost(
      mutation("upsertRule", { id: ruleId, autoPost: true }),
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

describe("the server's strict draft", () => {
  it("throws on a read of a row or a set that it did not load", () => {
    const strict = createStrictDraft();
    strict.addKeys("payees", [home.grocerId], []);

    expect(strict.draft.get("payees", home.grocerId)).toBeUndefined();
    expect(() => strict.draft.get("payees", home.employerId)).toThrow(
      NotLoadedError,
    );
    expect(() =>
      strict.draft.where("transactions", { payeeId: home.grocerId }),
    ).toThrow(NotLoadedError);
    expect(() => strict.draft.balanceAt(home.currentId, TODAY)).toThrow(
      NotLoadedError,
    );
  });
});
