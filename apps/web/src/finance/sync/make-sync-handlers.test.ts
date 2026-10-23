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
import { REPLICA_ROW_SHAPE, ROW_SHAPE_HEADER } from "./replica-row-shape.ts";
import {
  householdRowSchema,
  isSyncTableName,
  rowSchemas,
  type SyncTableName,
} from "./row-schemas.ts";

const ORIGIN = "https://qingqi.dev";
const URL_BASE = `${ORIGIN}/api/finance/sync`;

let db: TestDb;
let home: SeededHousehold;
let session: FinanceSession | null;
let configured: boolean;
let pushEffects: { householdId: string; effects: string[] }[];

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  configured = true;
  pushEffects = [];
  session = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    householdId: home.householdId,
    memberId: home.memberId,
    role: "owner",
  };
});

afterEach(async () => {
  await db.close();
});

function handlers(rowShape?: number) {
  return makeSyncHandlers({
    rowShape,
    isConfigured: () => configured,
    getDb: () => db,
    getSession: () => Promise.resolve(session),
    now: () => new Date("2026-10-10T12:00:00Z"),
    afterPush: (householdId, effects) => {
      pushEffects.push({ householdId, effects: [...effects] });
    },
  });
}

function pushRequest(
  body: unknown,
  origin: string | null = ORIGIN,
  rowShape: number | null = REPLICA_ROW_SHAPE,
) {
  return new Request(URL_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin === null ? {} : { Origin: origin }),
      ...(rowShape === null ? {} : { [ROW_SHAPE_HEADER]: String(rowShape) }),
    },
    body: JSON.stringify(body),
  });
}

function pullRequest(
  since: number,
  rowShape: number | null = REPLICA_ROW_SHAPE,
) {
  return new Request(`${URL_BASE}?since=${String(since)}`, {
    headers: rowShape === null ? {} : { [ROW_SHAPE_HEADER]: String(rowShape) },
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
    const response = await handlers().GET(pullRequest(0));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "not-configured" });
  });

  it("answers 401 without a session", async () => {
    session = null;
    const get = await handlers().GET(pullRequest(0));
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

    const pull = await handlers().GET(pullRequest(0));
    expect(pull.headers.get("Content-Type")).toContain("application/x-ndjson");
    const lines = await readNdjson(pull);
    expect(lines[0]).toMatchObject({
      type: "start",
      clock: 1,
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

  it("bootstraps a Transaction with its Entries, tags and balance days however old it is", async () => {
    await handlers().POST(
      pushRequest({
        clientId: randomUUID(),
        mutations: [expenseMutation("2021-01-15")],
      }),
    );

    const lines = await readNdjson(await handlers().GET(pullRequest(0)));
    const tables = new Map<string, unknown[]>();
    for (const line of lines) {
      if (line.type === "rows") {
        tables.set(line.table, [
          ...(tables.get(line.table) ?? []),
          ...line.rows,
        ]);
      }
    }
    expect(tables.get("transactions")).toHaveLength(1);
    expect(tables.get("entries")).toHaveLength(1);
    expect(tables.get("transactionTags")).toHaveLength(1);
    expect(tables.get("accountBalanceDays")).toHaveLength(1);
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

    const response = await handlers().GET(pullRequest(1));
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
    const response = await handlers().GET(pullRequest(9));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "resync", clock: 0 });
  });
});

describe("the row shape handshake", () => {
  const SERVER_SHAPE = REPLICA_ROW_SHAPE;

  async function storedTransactionCount() {
    const pull = await handlers().GET(pullRequest(0));
    const lines = await readNdjson(pull);
    return lines
      .filter((line) => line.type === "rows" && line.table === "transactions")
      .reduce(
        (count, line) => count + (line.type === "rows" ? line.rows.length : 0),
        0,
      );
  }

  it("says the server row shape on every response a handler returns, refusals included", async () => {
    const bootstrap = await handlers().GET(pullRequest(0));
    const pull = await handlers().GET(pullRequest(1));
    const push = await handlers().POST(
      pushRequest({ clientId: randomUUID(), mutations: [] }),
    );
    session = null;
    const refused = await handlers().GET(pullRequest(0));
    expect(
      [bootstrap, pull, push, refused].map((response) =>
        response.headers.get(ROW_SHAPE_HEADER),
      ),
    ).toEqual(Array(4).fill(String(SERVER_SHAPE)));
  });

  it("accepts a request without the header while the server row shape is 7, the shape of the clients from before the header", async () => {
    const server = handlers(7);
    const push = await server.POST(
      pushRequest(
        { clientId: randomUUID(), mutations: [expenseMutation("2026-10-01")] },
        ORIGIN,
        null,
      ),
    );
    const pull = await server.GET(pullRequest(1, null));
    expect([push.status, pull.status]).toEqual([200, 200]);
  });

  it("answers 426 and applies nothing to a client without the header once the server row shape is past 7", async () => {
    const server = handlers(8);
    const push = await server.POST(
      pushRequest(
        { clientId: randomUUID(), mutations: [expenseMutation("2026-10-01")] },
        ORIGIN,
        null,
      ),
    );
    const pull = await server.GET(pullRequest(1, null));
    const bootstrap = await server.GET(pullRequest(0, null));
    expect([push.status, pull.status, bootstrap.status]).toEqual([
      426, 426, 426,
    ]);
    expect(await push.json()).toEqual({ error: "row-shape", rowShape: 8 });
    expect(await storedTransactionCount()).toBe(0);
  });

  it.each([
    ["older", SERVER_SHAPE - 1],
    ["newer", SERVER_SHAPE + 1],
  ])(
    "answers 426 and applies nothing to a client with an %s row shape",
    async (_, clientShape) => {
      const push = await handlers().POST(
        pushRequest(
          {
            clientId: randomUUID(),
            mutations: [expenseMutation("2026-10-01")],
          },
          ORIGIN,
          clientShape,
        ),
      );
      const pull = await handlers().GET(pullRequest(1, clientShape));
      expect([push.status, pull.status]).toEqual([426, 426]);
      expect(push.headers.get(ROW_SHAPE_HEADER)).toBe(String(SERVER_SHAPE));
      expect(await storedTransactionCount()).toBe(0);
    },
  );

  it("lets an error a handler throws reach Next, without a response of its own", async () => {
    const server = makeSyncHandlers({
      isConfigured: () => true,
      getDb: () => {
        throw new Error("The database is gone");
      },
      getSession: () => Promise.resolve(session),
      now: () => new Date(),
    });
    await expect(server.GET(pullRequest(1))).rejects.toThrow(
      "The database is gone",
    );
  });

  it("answers 400 to a malformed row shape", async () => {
    const request = new Request(`${URL_BASE}?since=0`, {
      headers: { [ROW_SHAPE_HEADER]: "seven" },
    });
    const response = await handlers().GET(request);
    expect(response.status).toBe(400);
  });
});

describe("a push that changes an institution", () => {
  function upsertAccount(args: Record<string, unknown>, id = randomUUID()) {
    return { id, name: "upsertAccount", args };
  }

  it("reports the change after the push commits it, and only a real change", async () => {
    const clientId = randomUUID();
    const push = (mutation: ReturnType<typeof upsertAccount>) =>
      handlers().POST(pushRequest({ clientId, mutations: [mutation] }));

    await push(upsertAccount({ id: home.currentId, position: 3 }));
    await push(upsertAccount({ id: home.currentId, institution: "" }));
    await push(upsertAccount({ id: randomUUID(), institution: "Wise" }));
    expect(pushEffects).toEqual([]);

    const change = upsertAccount({
      id: home.currentId,
      institutionDomain: "wise.com",
    });
    const response = await push(change);
    await push(change);

    expect(response.status).toBe(200);
    expect(await response.json()).not.toHaveProperty("effects");
    expect(pushEffects).toEqual([
      { householdId: home.householdId, effects: ["institution-changed"] },
    ]);
  });
});
