import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect } from "vitest";
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
import { applyMutations } from "../sync/apply-mutations.ts";
import { MutationError } from "../sync/mutation-error.ts";
import { mutationSchema, type MutationInput } from "../sync/mutation-schema.ts";
import { pullChanges, readSnapshot, readTable } from "../sync/pull-changes.ts";
import { SYNC_TABLE_NAMES, type SyncTableName } from "../sync/row-schemas.ts";

export const NOW = new Date("2026-10-10T12:00:00Z");
export const TODAY = "2026-10-10";

export let db: TestDb;
export let home: SeededHousehold;

export function setUpDraftTestHousehold() {
  beforeEach(async () => {
    db = await createTestDb();
    home = await seedTestHousehold(db);
  });

  afterEach(async () => {
    await db.close();
  });
}

export type Input = Omit<MutationInput, "id">;

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

export async function push(...inputs: Input[]) {
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
export async function onBothSides(
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

export async function expectSame(input: Input, options?: { fresh?: boolean }) {
  const { browser, server } = await onBothSides(input, options);
  expect(browser).toEqual(server);
  return server;
}

export async function expectRefused(
  input: Input,
  reason: string,
  message: string,
) {
  const { browser, server } = await onBothSides(input);
  expect(server).toEqual({ reason, message });
  expect(browser).toEqual(server);
}

export function rowsOf(outcome: Outcome) {
  if (typeof outcome === "string" || !("rows" in outcome)) {
    throw new Error(`The mutation did not apply: ${JSON.stringify(outcome)}`);
  }
  return outcome.rows;
}

export function expense(fields: Record<string, unknown> = {}) {
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
export async function recordExpense(fields: Record<string, unknown> = {}) {
  const input = expense(fields);
  await push(input);
  const [entry] = input.args.entries;
  return { id: input.args.id, entryId: entry.id };
}
