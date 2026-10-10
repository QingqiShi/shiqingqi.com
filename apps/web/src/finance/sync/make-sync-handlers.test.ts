import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import type { FinanceSession } from "../auth/types.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { makeSyncHandlers } from "./make-sync-handlers.ts";
import {
  householdRowSchema,
  rowSchemas,
  type SyncTableName,
} from "./row-schemas.ts";

function isSyncTableName(name: string): name is SyncTableName {
  return name in rowSchemas;
}

const ORIGIN = "https://qingqi.dev";
const URL_BASE = `${ORIGIN}/api/finance/sync`;

/** The first test database of a file runs the migrations, which is slow on a busy machine. */
const DB_HOOK_TIMEOUT = 60_000;

let db: TestDb;
let home: SeededHousehold;
let session: FinanceSession | null;
let configured: boolean;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  configured = true;
  session = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    householdId: home.householdId,
    memberId: home.memberId,
    role: "owner",
  };
}, DB_HOOK_TIMEOUT);

afterEach(async () => {
  await db.close();
});

function handlers() {
  return makeSyncHandlers({
    isConfigured: () => configured,
    getDb: () => db,
    getSession: () => Promise.resolve(session),
    now: () => new Date("2026-10-10T12:00:00Z"),
  });
}

function pushRequest(body: unknown, origin: string | null = ORIGIN) {
  return new Request(URL_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin === null ? {} : { Origin: origin }),
    },
    body: JSON.stringify(body),
  });
}

function expenseMutation(date: string) {
  return {
    id: randomUUID(),
    name: "createTransaction",
    args: {
      id: randomUUID(),
      kind: "expense",
      date,
      amountMinor: -1_250,
      categoryId: home.groceriesId,
      payeeId: home.grocerId,
      entries: [
        { id: randomUUID(), accountId: home.currentId, amountMinor: -1_250 },
      ],
      tagIds: [home.trainTagId],
    },
  };
}

const bootstrapLineSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start"),
    clock: z.number(),
    household: householdRowSchema,
    transactionsFrom: z.string().nullable(),
  }),
  z.object({
    type: z.literal("rows"),
    table: z.string(),
    rows: z.array(z.unknown()),
  }),
  z.object({ type: z.literal("end"), clock: z.number() }),
]);

const pullResponseSchema = z.object({
  clock: z.number(),
  household: householdRowSchema,
  tables: z.record(z.string(), z.array(z.unknown())),
});

async function readNdjson(response: Response) {
  const text = await response.text();
  return text
    .trim()
    .split("\n")
    .map((line) => bootstrapLineSchema.parse(JSON.parse(line)));
}

function expectWireRows(table: SyncTableName, rows: unknown[]) {
  const schema = rowSchemas[table];
  for (const row of rows) {
    expect(schema.safeParse(row).error).toBeUndefined();
    expect(Object.keys(row ?? {}).sort()).toEqual(
      Object.keys(schema.shape).sort(),
    );
  }
}

describe("makeSyncHandlers", () => {
  it("answers 503 with a reason when Finance has no database", async () => {
    configured = false;
    const response = await handlers().GET(new Request(`${URL_BASE}?since=0`));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "not-configured" });
  });

  it("answers 401 without a session", async () => {
    session = null;
    const get = await handlers().GET(new Request(`${URL_BASE}?since=0`));
    const post = await handlers().POST(
      pushRequest({ clientId: randomUUID(), mutations: [] }),
    );
    expect([get.status, post.status]).toEqual([401, 401]);
    expect(get.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("answers 403 to a push from another origin", async () => {
    const body = { clientId: randomUUID(), mutations: [] };
    const foreign = await handlers().POST(
      pushRequest(body, "https://evil.example"),
    );
    const missing = await handlers().POST(pushRequest(body, null));
    expect([foreign.status, missing.status]).toEqual([403, 403]);
  });

  it("answers 400 to a body that is not a push", async () => {
    const response = await handlers().POST(pushRequest({ mutations: "no" }));
    expect(response.status).toBe(400);
  });

  it("pushes, then pulls the changes as wire rows", async () => {
    const push = await handlers().POST(
      pushRequest({
        clientId: randomUUID(),
        mutations: [expenseMutation("2026-10-01")],
      }),
    );
    expect(push.status).toBe(200);
    expect(push.headers.get("Cache-Control")).toBe("private, no-store");
    const pushed: unknown = await push.json();
    expect(pushed).toMatchObject({ rejected: [], clock: 1 });

    const pull = await handlers().GET(new Request(`${URL_BASE}?since=0`));
    expect(pull.headers.get("Content-Type")).toContain("application/x-ndjson");
    const lines = await readNdjson(pull);
    expect(lines[0]).toMatchObject({
      type: "start",
      clock: 1,
      transactionsFrom: null,
      household: { id: home.householdId, baseCurrency: "GBP" },
    });
    expect(lines.at(-1)).toEqual({ type: "end", clock: 1 });

    const tables = new Map<string, unknown[]>();
    for (const line of lines) {
      if (line.type === "rows") {
        tables.set(line.table, [
          ...(tables.get(line.table) ?? []),
          ...line.rows,
        ]);
      }
    }
    expect(tables.get("accounts")).toHaveLength(3);
    expect(tables.get("transactions")).toHaveLength(1);
    expect(tables.get("entries")).toHaveLength(1);
    expect(tables.get("transactionTags")).toHaveLength(1);
    expect(tables.get("accountBalanceDays")).toHaveLength(1);
    expect(tables.get("monthTotals")).toHaveLength(1);
    for (const [table, rows] of tables) {
      expect(isSyncTableName(table)).toBe(true);
      if (isSyncTableName(table)) expectWireRows(table, rows);
    }
  });

  it("pulls only what changed after the clock", async () => {
    await handlers().POST(
      pushRequest({
        clientId: randomUUID(),
        mutations: [expenseMutation("2026-10-01")],
      }),
    );
    await handlers().POST(
      pushRequest({
        clientId: randomUUID(),
        mutations: [expenseMutation("2026-10-03")],
      }),
    );

    const response = await handlers().GET(new Request(`${URL_BASE}?since=1`));
    const pull = pullResponseSchema.parse(await response.json());
    expect(pull.clock).toBe(2);
    expect(pull.household.id).toBe(home.householdId);
    expect(Object.keys(pull.tables).sort()).toEqual([
      "accountBalanceDays",
      "entries",
      "monthTotals",
      "transactionTags",
      "transactions",
    ]);
    expect(pull.tables.transactions).toEqual([
      expect.objectContaining({ date: "2026-10-03", version: 2 }),
    ]);
    for (const [table, rows] of Object.entries(pull.tables)) {
      expect(isSyncTableName(table)).toBe(true);
      if (isSyncTableName(table)) expectWireRows(table, rows);
    }
  });

  it("asks for a fresh bootstrap when the client is ahead of the server", async () => {
    const response = await handlers().GET(new Request(`${URL_BASE}?since=9`));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "resync", clock: 0 });
  });
});
