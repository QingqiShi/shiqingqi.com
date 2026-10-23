import { randomUUID } from "node:crypto";
import {
  eq,
  getTableColumns,
  getTableName,
  is,
  sql,
  type SQL,
} from "drizzle-orm";
import { getTableConfig, PgTable, type PgColumn } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { hashToken } from "../auth/hash-token.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import { pullChanges } from "../sync/pull-changes.ts";
import { streamBootstrap } from "../sync/stream-bootstrap.ts";
import {
  accountBalanceDays,
  appliedMutations,
  bankBalances,
  bankLinks,
  bankTransactions,
  connections,
  emailCodes,
  emailVerifications,
  entries,
  exchangeRates,
  fxRates,
  households,
  institutionDomainGuesses,
  institutionIcons,
  invites,
  monthTotals,
  passkeys,
  reports,
  rules,
  schema,
  sessions,
  signUps,
  transactions,
  transactionTags,
  users,
  valuations,
} from "./schema.ts";
import { createTestDb, type TestDb } from "./testing/create-test-db.ts";
import { failureOf } from "./testing/failure-of.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "./testing/seed-test-household.ts";
import type { FinanceDb } from "./types.ts";
import {
  asFinanceApp,
  withHousehold,
  type FinanceAppDb,
} from "./with-household.ts";

// "fx_rates" and "month_totals" are not in `schema`, but older deployments
// still use them. Keep them in these tests until a migration removes them.
const tables: PgTable[] = [
  ...Object.values(schema).flatMap((value) =>
    is(value, PgTable) ? [value] : [],
  ),
  fxRates,
  monthTotals,
];
const globalTables = new Set<PgTable>([
  users,
  passkeys,
  sessions,
  emailVerifications,
  emailCodes,
  signUps,
  institutionDomainGuesses,
  institutionIcons,
  exchangeRates,
]);
/** The column that names the Household of a row. */
function householdKey(table: PgTable): PgColumn {
  if (table === households) return households.id;
  const columns = getTableColumns(table);
  if (!("householdId" in columns)) {
    throw new Error(`${getTableName(table)} has no household_id`);
  }
  return columns.householdId;
}

/** Every table that belongs to one Household, with the column that names it. */
const householdTables = tables
  .filter((table) => !globalTables.has(table))
  .map((table) => ({
    name: getTableName(table),
    table,
    key: householdKey(table),
  }));

/** The composite references of every Household table: `(household_id, column)` to a parent's `(household_id, id)`. */
const householdReferences = householdTables.flatMap(({ name, table }) =>
  getTableConfig(table)
    .foreignKeys.map((foreignKey) => foreignKey.reference())
    .filter((reference) => reference.columns.length === 2)
    .map((reference) => {
      const column = reference.columns.find(
        (candidate) => candidate.name !== "household_id",
      );
      if (!column) throw new Error(`${name}: no referencing column`);
      return {
        name: `${name}.${column.name}`,
        table,
        column,
        parent: reference.foreignTable,
      };
    }),
);

const countSchema = z.object({ count: z.number() });

/** How many rows `statement`, a data-modifying statement with `returning`, changed. */
async function countChanged(db: FinanceAppDb, statement: SQL) {
  const result: unknown = await db.execute(
    sql`with changed as (${statement}) select count(*)::int as count from changed`,
  );
  const rows = z.object({ rows: z.array(countSchema) }).parse(result).rows;
  return rows[0]?.count ?? 0;
}

/** One row in every Household table that `seedTestHousehold` leaves empty; `month` keeps the two Households' keys apart. */
async function seedEveryTable(
  db: FinanceDb,
  home: SeededHousehold,
  month: string,
) {
  const householdId = home.householdId;
  const id = (key: string) => `${key}-${householdId}`;
  const userId = randomUUID();
  const transactionId = randomUUID();
  const ruleId = randomUUID();
  const connectionId = randomUUID();
  const linkId = randomUUID();
  const day = `${month}-10`;
  await db.insert(users).values({ id: userId, displayName: id("user") });
  await db.insert(invites).values({
    id: randomUUID(),
    householdId,
    memberId: home.partnerId,
    tokenHash: hashToken(id("invite")),
    createdBy: userId,
    expiresAt: new Date("2030-01-01T00:00:00Z"),
  });
  await db.insert(valuations).values({
    id: randomUUID(),
    householdId,
    accountId: home.currentId,
    on: day,
    amountMinor: 100,
    version: 1,
  });
  await db.insert(rules).values({
    id: ruleId,
    householdId,
    name: "Rent",
    unit: "month",
    startsOn: day,
    nextOn: day,
    template: {},
    version: 1,
  });
  await db.insert(transactions).values({
    id: transactionId,
    householdId,
    kind: "expense",
    date: day,
    categoryId: home.groceriesId,
    payeeId: home.grocerId,
    memberId: home.memberId,
    ruleId,
    version: 1,
  });
  await db.insert(entries).values({
    id: randomUUID(),
    householdId,
    transactionId,
    accountId: home.currentId,
    date: day,
    amountMinor: -100,
    version: 1,
  });
  await db.insert(transactionTags).values({
    transactionId,
    tagId: home.trainTagId,
    householdId,
    version: 1,
  });
  await db.insert(accountBalanceDays).values({
    householdId,
    accountId: home.currentId,
    day,
    balanceMinor: 0,
    version: 1,
  });
  await db.insert(monthTotals).values({
    householdId,
    month: `${month}-01`,
    kind: "expense",
    categoryId: home.groceriesId,
    amountMinor: -100,
    count: 1,
    version: 1,
  });
  await db.insert(fxRates).values({
    householdId,
    base: "GBP",
    quote: "CNY",
    on: day,
    rate: 9.1,
    version: 1,
  });
  await db.insert(appliedMutations).values({
    householdId,
    clientId: randomUUID(),
    mutationId: randomUUID(),
  });
  await db.insert(connections).values({
    id: connectionId,
    householdId,
    label: "Lunch Flow",
    credential: hashToken(householdId),
    credentialLastFour: householdId.slice(-4),
    credentialSavedAt: new Date(`${day}T12:00:00Z`),
    version: 1,
  });
  await db.insert(bankLinks).values({
    id: linkId,
    householdId,
    connectionId,
    accountId: home.currentId,
    providerAccountId: id("provider-account"),
    currency: "GBP",
    version: 1,
  });
  await db.insert(bankTransactions).values({
    id: randomUUID(),
    householdId,
    linkId,
    providerTxId: id("provider-tx"),
    date: day,
    amountMinor: -100,
    currency: "GBP",
    raw: {},
    transactionId,
    version: 1,
  });
  await db.insert(bankBalances).values({
    householdId,
    linkId,
    fetchedAt: new Date(`${day}T12:00:00Z`),
    amountMinor: 0,
    currency: "GBP",
  });
  await db.insert(reports).values({
    id: randomUUID(),
    householdId,
    periodStart: `${month}-05`,
    periodEnd: `${month}-11`,
    data: {},
    version: 1,
  });
}

let db: TestDb;
let a: SeededHousehold;
let b: SeededHousehold;

function countRows(table: PgTable, key: PgColumn, householdId: string) {
  return db.$count(table, eq(key, householdId));
}

beforeAll(async () => {
  db = await createTestDb();
  a = await seedTestHousehold(db, "a");
  b = await seedTestHousehold(db, "b");
  await seedEveryTable(db, a, "2026-01");
  await seedEveryTable(db, b, "2026-02");
});

afterAll(async () => {
  await db.close();
});

describe("the schema", () => {
  it("has a seeded row of both Households in every Household table", async () => {
    for (const { name, table, key } of householdTables) {
      expect(await countRows(table, key, a.householdId), name).toBeGreaterThan(
        0,
      );
      expect(await countRows(table, key, b.householdId), name).toBeGreaterThan(
        0,
      );
    }
  });

  it("forces row level security with the household_isolation policy on every Household table", async () => {
    const protectedTables = await db
      .select({
        name: sql<string>`c.relname`,
        forced: sql<boolean>`c.relrowsecurity and c.relforcerowsecurity`,
        policies: sql<
          string[]
        >`coalesce(array_agg(p.policyname order by p.policyname) filter (where p.policyname is not null), '{}')`,
      })
      .from(sql`pg_class c`)
      .leftJoin(
        sql`pg_policies p`,
        sql`p.tablename = c.relname and p.schemaname = 'public'`,
      )
      .where(sql`c.relnamespace = 'public'::regnamespace and c.relkind = 'r'`)
      .groupBy(sql`c.relname, c.relrowsecurity, c.relforcerowsecurity`);
    const byName = new Map(protectedTables.map((row) => [row.name, row]));

    for (const { name } of householdTables) {
      expect(byName.get(name)?.forced, name).toBe(true);
      expect(byName.get(name)?.policies, name).toContain("household_isolation");
    }
    expect(
      [...globalTables].map((table) => byName.get(getTableName(table))?.forced),
    ).toEqual([...globalTables].map(() => false));
  });

  it("lets finance_app use every table without owning any, and without BYPASSRLS", async () => {
    const [role] = await db
      .select({
        superuser: sql<boolean>`rolsuper`,
        bypassesRls: sql<boolean>`rolbypassrls`,
        canLogIn: sql<boolean>`rolcanlogin`,
      })
      .from(sql`pg_roles`)
      .where(sql`rolname = 'finance_app'`);
    expect(role).toEqual({
      superuser: false,
      bypassesRls: false,
      canLogIn: false,
    });
    expect(
      await db.$count(
        sql`pg_class`,
        sql`relowner = 'finance_app'::regrole or relowner = 'finance_auth'::regrole`,
      ),
    ).toBe(0);
    for (const table of tables) {
      const [privilege] = await db
        .select({
          granted: sql<boolean>`has_table_privilege('finance_app', ${sql.raw(`'${getTableName(table)}'`)}, 'SELECT, INSERT, UPDATE, DELETE')`,
        })
        .from(sql`(select 1) as one`);
      expect(privilege.granted, getTableName(table)).toBe(true);
    }
  });
});

describe("a Household scope", () => {
  it.each(householdTables)(
    "reads, updates and deletes only its own rows of $name",
    async ({ table, key }) => {
      const own = await countRows(table, key, a.householdId);
      const others = await countRows(table, key, b.householdId);
      const keepKey = sql`update ${table} set ${sql.identifier(key.name)} = ${key}`;

      const seen = await withHousehold(db, a.householdId, async (scope) => ({
        read: await scope.db.$count(table),
        updated: await countChanged(scope.db, sql`${keepKey} returning 1`),
        updatedOfOther: await countChanged(
          scope.db,
          sql`${keepKey} where ${key} = ${b.householdId} returning 1`,
        ),
        deletedOfOther: await countChanged(
          scope.db,
          sql`delete from ${table} where ${key} = ${b.householdId} returning 1`,
        ),
      }));

      expect(seen).toEqual({
        read: own,
        updated: own,
        updatedOfOther: 0,
        deletedOfOther: 0,
      });
      expect(await countRows(table, key, b.householdId)).toBe(others);
    },
  );

  it.each(householdTables)(
    "cannot insert a row of another Household into $name",
    async ({ table, key }) => {
      const [row] = await db.select().from(table).where(eq(key, b.householdId));
      const { id, ...rest } = row;
      const copy =
        typeof id === "string" ? { ...rest, id: randomUUID() } : rest;
      expect(
        await failureOf(
          withHousehold(db, a.householdId, (scope) =>
            scope.db.insert(table).values(copy),
          ),
        ),
      ).toMatch(/row-level security/);
    },
  );

  it("sees nothing without a Household, and inserts nothing", async () => {
    const counts = await asFinanceApp(db, async (tx) => {
      const counts: Record<string, number> = {};
      for (const { name, table } of householdTables) {
        counts[name] = await tx.$count(table);
      }
      return counts;
    });
    expect(Object.values(counts)).toEqual(householdTables.map(() => 0));
    expect(
      await failureOf(
        asFinanceApp(db, (tx) =>
          tx.insert(households).values({ id: randomUUID(), name: "Nobody" }),
        ),
      ),
    ).toMatch(/row-level security/);
  });

  it("sees nothing of a Household that does not exist", async () => {
    const counts = await withHousehold(db, randomUUID(), async (scope) => {
      const counts: Record<string, number> = {};
      for (const { name, table } of householdTables) {
        counts[name] = await scope.db.$count(table);
      }
      return counts;
    });
    expect(Object.values(counts)).toEqual(householdTables.map(() => 0));
  });
});

describe("composite references", () => {
  it("cover every reference between Household tables", () => {
    const singleColumn = householdTables.flatMap(({ name, table }) =>
      getTableConfig(table)
        .foreignKeys.map((foreignKey) => foreignKey.reference())
        .filter(
          (reference) =>
            reference.columns.length === 1 &&
            !globalTables.has(reference.foreignTable) &&
            reference.foreignTable !== households,
        )
        .map((reference) => `${name}.${reference.columns[0].name}`),
    );
    expect(singleColumn).toEqual([]);
    expect(householdReferences.length).toBeGreaterThan(20);
  });

  it.each(householdReferences)(
    "$name cannot point at another Household's row",
    async ({ table, column, parent }) => {
      const key = householdKey(table);
      const parentIds = (
        await db
          .select({ id: sql<string>`id` })
          .from(parent)
          .where(eq(householdKey(parent), b.householdId))
      ).map((row) => row.id);
      expect(parentIds.length).toBeGreaterThan(0);

      const outcomes: string[] = [];
      for (const parentId of parentIds) {
        const message = await failureOf(
          db.transaction(async (tx) => {
            await tx.execute(
              sql`update ${table} set ${sql.identifier(column.name)} = ${parentId} where ${key} = ${a.householdId}`,
            );
            throw new Error("rolled back");
          }),
        );
        if (message === "rolled back") {
          outcomes.push("accepted");
          continue;
        }
        if (/violates foreign key constraint/.test(message)) {
          outcomes.push("rejected");
          break;
        }
      }
      expect(outcomes).toEqual(["rejected"]);
    },
  );
});

describe("sync", () => {
  it("pulls and bootstraps only the Household's own rows", async () => {
    const own = randomUUID();
    const other = randomUUID();
    const expense = (id: string, home: SeededHousehold) => ({
      id: randomUUID(),
      name: "createTransaction",
      args: {
        id,
        kind: "expense",
        status: "posted",
        date: "2026-03-01",
        amountMinor: -500,
        categoryId: home.groceriesId,
        payeeId: home.grocerId,
        memberId: home.memberId,
        ruleId: null,
        refundOfId: null,
        note: "",
        needsReview: false,
        entries: [
          { id: randomUUID(), accountId: home.currentId, amountMinor: -500 },
        ],
        tagIds: [],
      },
    });
    const now = new Date("2026-03-02T12:00:00Z");
    const pushed = await applyMutations(
      db,
      a.householdId,
      { clientId: randomUUID(), mutations: [expense(own, a)] },
      now,
    );
    expect(pushed.rejected).toEqual([]);
    const pushedOther = await applyMutations(
      db,
      b.householdId,
      { clientId: randomUUID(), mutations: [expense(other, b)] },
      now,
    );
    expect(pushedOther.rejected).toEqual([]);
    const foreign = await applyMutations(
      db,
      a.householdId,
      { clientId: randomUUID(), mutations: [expense(randomUUID(), b)] },
      now,
    );
    expect(foreign.applied).toEqual([]);
    expect(foreign.rejected).toHaveLength(1);

    const pulled = await pullChanges(db, a.householdId, 0);
    const pulledIds = (pulled.tables.transactions ?? []).map(
      (row) => z.object({ id: z.string() }).parse(row).id,
    );
    expect(pulledIds).toContain(own);
    expect(pulledIds).not.toContain(other);
    for (const rows of Object.values(pulled.tables)) {
      for (const row of rows) {
        if ("householdId" in row) {
          expect(row.householdId).toBe(a.householdId);
        }
      }
    }

    const bootstrap = await new Response(
      streamBootstrap(db, a.householdId),
    ).text();
    expect(bootstrap).toContain(own);
    expect(bootstrap).not.toContain(other);
    expect(bootstrap).not.toContain(b.householdId);
  });
});
