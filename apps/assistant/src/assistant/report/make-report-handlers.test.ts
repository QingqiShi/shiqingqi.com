import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { morningReports } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { insertUser } from "#src/assistant/mail/testing/insert-account.ts";
import { makeReportHandlers } from "./make-report-handlers.ts";

const ORIGIN = "http://localhost:3000";
const FIRST = new Date("2026-11-02T08:00:00Z");
const LATER = new Date("2026-11-02T09:00:00Z");

let db: TestDb;
let owner: string;
let stranger: string;
let reportId: string;

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db);
  stranger = await insertUser(db);
  const [report] = await db
    .insert(morningReports)
    .values({
      userId: owner,
      localDate: "2026-11-02",
      builtAt: FIRST,
      content: {
        version: 2,
        mailDate: "2026-11-01",
        status: "failed",
        headline: null,
        needsAction: [],
        worthKnowing: [],
        rest: null,
        agenda: null,
        mailCount: 0,
        ranOutOfTime: false,
        unreadMailboxes: [],
        doneTodos: [],
      },
    })
    .returning({ id: morningReports.id });
  reportId = report.id;
});

afterEach(async () => {
  await db.close();
});

function markSeen(id: string, userId: string, now: Date) {
  return makeReportHandlers({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () => Promise.resolve({ sessionId: randomUUID(), userId }),
    now: () => now,
  }).markSeen(
    new Request(`${ORIGIN}/api/reports/${id}/seen`, {
      method: "POST",
      headers: { Origin: ORIGIN },
    }),
    id,
  );
}

async function seenAt() {
  const [report] = await db
    .select({ seenAt: morningReports.seenAt })
    .from(morningReports)
    .where(eq(morningReports.id, reportId));
  return report.seenAt;
}

describe("the seen route", () => {
  it("keeps the time the owner first saw the report", async () => {
    expect((await markSeen(reportId, owner, FIRST)).status).toBe(204);
    expect((await markSeen(reportId, owner, LATER)).status).toBe(204);
    expect(await seenAt()).toEqual(FIRST);
  });

  it("does not mark another user's report", async () => {
    expect((await markSeen(reportId, stranger, FIRST)).status).toBe(404);
    expect(await seenAt()).toBeNull();
  });

  it("answers 404 for an unknown id", async () => {
    expect((await markSeen(randomUUID(), owner, FIRST)).status).toBe(404);
    expect((await markSeen("not-a-uuid", owner, FIRST)).status).toBe(404);
  });
});
