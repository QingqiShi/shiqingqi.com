import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { recomputeDerived } from "../db/repositories/recompute-derived.ts";
import { accountGroups, reports, valuations } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { makeReportHandlers } from "./make-report-handlers.ts";
import { makeWeeklyReportCronHandler } from "./make-weekly-report-cron-handler.ts";
import { reportApiSchemas } from "./report-api-schemas.ts";

const ORIGIN = "https://qingqi.dev";
const NOW = new Date("2026-10-10T12:00:00Z");
const SECRET = "cron-secret-for-tests";
const DB_HOOK_TIMEOUT = 60_000;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

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
  await recomputeDerived(
    db,
    household.householdId,
    { accounts: "all", months: "all" },
    1,
  );
}

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db, "home");
  other = await seedTestHousehold(db, "other");
  await seedBalances(home);
  await seedBalances(other);
  // With Latin names only, the default font covers the image and no font is fetched.
  await db
    .update(accountGroups)
    .set({ name: "Cash" })
    .where(eq(accountGroups.side, "asset"));
  await db
    .update(accountGroups)
    .set({ name: "Credit" })
    .where(eq(accountGroups.side, "liability"));
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

const handlers = makeReportHandlers({
  isConfigured: () => true,
  getDb: () => db,
  getSession: () => Promise.resolve(session),
  loadFonts: () => Promise.resolve([]),
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

function isUint8ArrayConstructor(
  value: unknown,
): value is Uint8ArrayConstructor {
  return typeof value === "function" && value.name === "Uint8Array";
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
      handlers.image(request(`${id}/image`), routeContext(id)),
    ]);
    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401,
    ]);
  });

  it("stores last week's report and serves its data", async () => {
    const created = reportApiSchemas.regenerate.parse(
      await (await regenerate()).json(),
    );
    expect(created.periodEnd).toBe("2026-10-04");
    expect(created.written).toBe(true);

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
    expect(again).toMatchObject({ id: created.id, written: false });
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

  it("limits how often a Household regenerates or renders a Report", async () => {
    const buckets: string[] = [];
    const limited = makeReportHandlers({
      isConfigured: () => true,
      getDb: () => db,
      getSession: () => Promise.resolve(session),
      loadFonts: () => Promise.resolve([]),
      now: () => NOW,
      limitRequest: (bucket) => {
        buckets.push(bucket);
        return Promise.resolve({
          success: false,
          reset: NOW.getTime() + 30_000,
        });
      },
    });
    const id = randomUUID();

    const regenerated = await limited.regenerate(
      request("regenerate", { method: "POST", body: {} }),
    );
    const image = await limited.image(request(`${id}/image`), routeContext(id));

    expect([regenerated.status, image.status]).toEqual([429, 429]);
    expect(regenerated.headers.get("Retry-After")).toBe("30");
    expect(buckets).toEqual(["report-regenerate", "report-image"]);
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

  it("deletes a report of the household, and only with a same-origin request", async () => {
    const homeSession = session;
    if (!homeSession) throw new Error("No session");
    session = { ...homeSession, householdId: other.householdId };
    const otherReport = reportApiSchemas.regenerate.parse(
      await (await regenerate()).json(),
    );
    session = { ...homeSession, role: "member" };
    const { id } = reportApiSchemas.regenerate.parse(
      await (await regenerate()).json(),
    );
    const remove = (reportId: string, origin?: string) =>
      handlers.remove(
        request(reportId, { method: "DELETE", origin }),
        routeContext(reportId),
      );

    expect((await remove(id, "https://example.com")).status).toBe(403);
    expect((await remove(otherReport.id)).status).toBe(404);
    expect((await remove("not-a-uuid")).status).toBe(404);

    const removed = await remove(id);
    expect(removed.status).toBe(204);
    expect(removed.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await remove(id)).status).toBe(404);
    expect((await db.select().from(reports)).map((row) => row.id)).toEqual([
      otherReport.id,
    ]);
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

  describe("share image", () => {
    const jsdomUint8Array = globalThis.Uint8Array;
    // jsdom puts its own Uint8Array on the global object, so sharp does not
    // see Node bytes as a buffer. The image renderer runs in Node, so give
    // it the Node Uint8Array while it renders.
    beforeAll(() => {
      const nodeUint8Array: unknown = Object.getPrototypeOf(Buffer);
      if (isUint8ArrayConstructor(nodeUint8Array)) {
        globalThis.Uint8Array = nodeUint8Array;
      }
    });
    afterAll(() => {
      globalThis.Uint8Array = jsdomUint8Array;
    });

    it("renders the share image as a PNG in both locales", async () => {
      const { id } = reportApiSchemas.regenerate.parse(
        await (await regenerate()).json(),
      );
      for (const query of ["locale=en&names=1", "locale=zh&names=0"]) {
        const response = await handlers.image(
          request(`${id}/image?${query}`),
          routeContext(id),
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("image/png");
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
        const bytes = new Uint8Array(await response.arrayBuffer());
        expect([...bytes.slice(0, 4)]).toEqual(PNG_SIGNATURE);
        expect(bytes.length).toBeLessThan(1_000_000);
      }
    }, 30_000);
  });
});

describe("makeWeeklyReportCronHandler", () => {
  function cron(secret: string | undefined = SECRET) {
    return makeWeeklyReportCronHandler({
      isConfigured: () => true,
      getDb: () => db,
      getCronSecret: () => secret,
      now: () => new Date("2026-10-12T07:00:00Z"),
    });
  }

  function cronRequest(authorization?: string) {
    return new Request(`${ORIGIN}/api/finance/cron/weekly-report`, {
      headers:
        authorization === undefined ? {} : { Authorization: authorization },
    });
  }

  it("refuses a request without the cron secret", async () => {
    const responses = await Promise.all([
      cron()(cronRequest()),
      cron()(cronRequest("Bearer wrong")),
      cron(undefined)(cronRequest("Bearer undefined")),
    ]);
    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401,
    ]);
    expect(await db.select().from(reports)).toEqual([]);
  });

  it("stores last week's report for every household", async () => {
    const response = await cron()(cronRequest(`Bearer ${SECRET}`));
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
