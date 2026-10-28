import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { recomputeDerived } from "../db/repositories/recompute-derived.ts";
import { valuations } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { withHousehold } from "../db/with-household.ts";
import { makeReportHandlers } from "./make-report-handlers.ts";
import { reportApiSchemas } from "./report-api-schemas.ts";

const ORIGIN = "https://qingqi.dev";
const NOW = new Date("2026-10-10T12:00:00Z");

let db: TestDb;
let home: SeededHousehold;
let other: SeededHousehold;
let session: FinanceSession | null;

async function seedBalances(household: SeededHousehold) {
  await db.insert(valuations).values([
    {
      id: randomUUID(),
      householdId: household.householdId,
      accountId: household.currentId,
      on: "2026-08-31",
      amountMinor: 250_000,
      version: 1,
    },
    {
      id: randomUUID(),
      householdId: household.householdId,
      accountId: household.cardId,
      on: "2026-09-15",
      amountMinor: -40_000,
      version: 1,
    },
  ]);
  await withHousehold(db, household.householdId, (scope) =>
    recomputeDerived({ ...scope, version: 1 }, { accounts: "all" }),
  );
}

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db, "home");
  other = await seedTestHousehold(db, "other");
  await seedBalances(home);
  await seedBalances(other);
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

const handlers = makeReportHandlers({
  isConfigured: () => true,
  getDb: () => db,
  getSession: () => Promise.resolve(session),
  now: () => NOW,
});

function request(
  path: string,
  init: { method?: string; body?: unknown; origin?: string | null } = {},
) {
  const origin = init.origin === undefined ? ORIGIN : init.origin;
  return new Request(`${ORIGIN}/api/finance/reports/${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(origin === null ? {} : { Origin: origin }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function regenerate(body: unknown = {}) {
  return handlers.regenerate(request("regenerate", { method: "POST", body }));
}

describe("makeReportHandlers", () => {
  it("needs a session and, to regenerate, a same-origin request", async () => {
    expect((await regenerate()).status).toBe(200);
    const crossSite = await handlers.regenerate(
      request("regenerate", {
        method: "POST",
        body: {},
        origin: "https://example.com",
      }),
    );
    expect(crossSite.status).toBe(403);

    session = null;
    const id = randomUUID();
    const responses = await Promise.all([
      regenerate(),
      handlers.getReport(request(id), routeContext(id)),
    ]);
    expect(responses.map((response) => response.status)).toEqual([401, 401]);
  });

  it("hides another household's report", async () => {
    const homeSession = session;
    if (!homeSession) throw new Error("No session");
    session = { ...homeSession, householdId: other.householdId };
    const { id } = reportApiSchemas.regenerate.parse(
      await (await regenerate()).json(),
    );
    session = homeSession;
    const response = await handlers.getReport(request(id), routeContext(id));
    expect(response.status).toBe(404);
  });

  it("limits how often a Household regenerates a Report", async () => {
    const buckets: string[] = [];
    const limited = makeReportHandlers({
      isConfigured: () => true,
      getDb: () => db,
      getSession: () => Promise.resolve(session),
      now: () => NOW,
      limitRequest: (bucket) => {
        buckets.push(bucket);
        return Promise.resolve({
          success: false,
          reset: NOW.getTime() + 30_000,
        });
      },
    });
    const regenerated = await limited.regenerate(
      request("regenerate", { method: "POST", body: {} }),
    );

    expect(regenerated.status).toBe(429);
    expect(regenerated.headers.get("Retry-After")).toBe("30");
    expect(buckets).toEqual(["report-regenerate"]);
  });
});
