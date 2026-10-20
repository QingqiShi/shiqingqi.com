import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { recomputeDerived } from "../db/repositories/recompute-derived.ts";
import { reports, valuations } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { withHousehold } from "../db/with-household.ts";
import { makeReportHandlers } from "./make-report-handlers.ts";
import { makeWeeklyReportCronHandler } from "./make-weekly-report-cron-handler.ts";
import { reportApiSchemas } from "./report-api-schemas.ts";

const ORIGIN = "https://qingqi.dev";
const NOW = new Date("2026-10-10T12:00:00Z");
const SECRET = "cron-secret-for-tests";

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
    recomputeDerived(
      { ...scope, version: 1 },
      { accounts: "all", months: "all" },
    ),
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

  it("stores last week's report and serves its data", async () => {
    const created = reportApiSchemas.regenerate.parse(
      await (await regenerate()).json(),
    );
    expect(created.periodEnd).toBe("2026-10-04");

    const response = await handlers.getReport(
      request(created.id),
      routeContext(created.id),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const report = reportApiSchemas.report.parse(await response.json());
    expect(report.data.balanceSheet.netWorthMinor).toBe(210_000);
    expect(report.data.periodStart).toBe("2026-09-28");

    const again = reportApiSchemas.regenerate.parse(
      await (await regenerate({ periodEnd: "2026-10-01" })).json(),
    );
    expect(again).toMatchObject({ id: created.id });
  });

  it("refuses a week that has not ended", async () => {
    const response = await regenerate({ periodEnd: "2026-10-10" });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "week-not-ended" });
    expect((await regenerate({ periodEnd: "October" })).status).toBe(400);
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

  it("lists the household's reports, newest week first", async () => {
    const homeSession = session;
    if (!homeSession) throw new Error("No session");
    session = { ...homeSession, householdId: other.householdId };
    const otherReport = reportApiSchemas.regenerate.parse(
      await (await regenerate()).json(),
    );
    session = homeSession;
    await regenerate({ periodEnd: "2026-09-20" });
    await regenerate();
    await regenerate({ periodEnd: "2026-09-27" });

    const response = await handlers.listReports(request(""));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const { reports: listed } = reportApiSchemas.list.parse(
      await response.json(),
    );
    expect(listed.map((report) => report.periodEnd)).toEqual([
      "2026-10-04",
      "2026-09-27",
      "2026-09-20",
    ]);
    expect(listed[0].periodStart).toBe("2026-09-28");
    expect(listed.map((report) => report.id)).not.toContain(otherReport.id);
    const newest = reportApiSchemas.report.parse(
      await (
        await handlers.getReport(
          request(listed[0].id),
          routeContext(listed[0].id),
        )
      ).json(),
    );
    expect(listed[0].generatedAt).toBe(newest.generatedAt);

    session = null;
    expect((await handlers.listReports(request(""))).status).toBe(401);
  });

  it("says a report with an old shape is outdated", async () => {
    const { id } = reportApiSchemas.regenerate.parse(
      await (await regenerate()).json(),
    );
    await db.update(reports).set({ data: { schemaVersion: 0 } });
    const response = await handlers.getReport(request(id), routeContext(id));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "outdated",
      periodEnd: "2026-10-04",
    });
  });
});

describe("makeWeeklyReportCronHandler", () => {
  it("stores last week's report for every household", async () => {
    const cron = makeWeeklyReportCronHandler({
      isConfigured: () => true,
      getDb: () => db,
      getCronSecret: () => SECRET,
      now: () => new Date("2026-10-12T07:00:00Z"),
    });
    const response = await cron(
      new Request(`${ORIGIN}/api/finance/cron/weekly-report`, {
        headers: { Authorization: `Bearer ${SECRET}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      households: 2,
      written: 2,
      failed: 0,
    });
    const stored = await db.select().from(reports);
    expect(stored.map((row) => row.periodEnd)).toEqual([
      "2026-10-11",
      "2026-10-11",
    ]);
  });
});
