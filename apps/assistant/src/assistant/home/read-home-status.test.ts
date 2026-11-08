import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  agentRuns,
  morningReports,
  userSettings,
} from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import {
  insertAccount,
  insertUser,
} from "#src/assistant/mail/testing/insert-account.ts";
import { chooseHomeView } from "./choose-home-view.ts";
import { readHomeStatus } from "./read-home-status.ts";

const NOW = new Date("2026-11-02T10:07:00Z");

let db: TestDb;
let owner: string;
let stranger: string;

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db);
  stranger = await insertUser(db);
});

afterEach(async () => {
  await db.close();
});

function insertRun(
  userId: string,
  task: "organise" | "report",
  secondsAgo: number,
) {
  return db.insert(agentRuns).values({
    userId,
    task,
    modelId: "test",
    startedAt: new Date(NOW.getTime() - secondsAgo * 1000),
    progress: { inFlight: [{ kind: "list_folders" }], recent: [] },
  });
}

function insertReport(userId: string, localDate: string, seenAt: Date | null) {
  return db.insert(morningReports).values({
    userId,
    localDate,
    seenAt,
    builtAt: NOW,
    content: {
      version: 2,
      mailDate: localDate,
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
  });
}

const statusOf = (userId: string) => readHomeStatus({ db, userId }, NOW);

describe("readHomeStatus", () => {
  it("never gives another user's run, report or schedule", async () => {
    await insertRun(stranger, "organise", 10);
    await insertReport(stranger, "2026-11-02", null);
    await insertAccount(db, stranger);
    await db
      .insert(userSettings)
      .values({ userId: stranger, organiseEnabled: true });

    expect(await statusOf(owner)).toEqual({
      serverNow: NOW.toISOString(),
      run: null,
      nextOrganiseAt: null,
      unseenReportDate: null,
      localDate: "2026-11-02",
    });
  });

  it("gives the date in the owner's time zone", async () => {
    await db
      .insert(userSettings)
      .values({ userId: owner, timeZone: "Pacific/Kiritimati" });
    expect((await statusOf(owner)).localDate).toBe("2026-11-03");
  });

  it("gives the newest run that can still be alive", async () => {
    await insertRun(owner, "organise", 400);
    await insertRun(owner, "report", 900);
    expect((await statusOf(owner)).run).toBeNull();

    await insertRun(owner, "report", 400);
    expect((await statusOf(owner)).run).toMatchObject({
      task: "report",
      progress: { inFlight: [{ kind: "list_folders" }], recent: [] },
    });
  });

  it("gives the next organise run only when one will come", async () => {
    await db
      .insert(userSettings)
      .values({ userId: owner, organiseEnabled: true });
    expect((await statusOf(owner)).nextOrganiseAt).toBeNull();

    await insertAccount(db, owner);
    expect((await statusOf(owner)).nextOrganiseAt).toBe(
      "2026-11-02T10:30:00.000Z",
    );
  });

  it("chooses the report only while the newest one is unseen", async () => {
    expect(chooseHomeView(await statusOf(owner))).toBe("today");

    await insertReport(owner, "2026-11-01", null);
    const unseen = await statusOf(owner);
    expect(unseen.unseenReportDate).toBe("2026-11-01");
    expect(chooseHomeView(unseen)).toBe("report");

    await insertReport(owner, "2026-11-02", NOW);
    const seen = await statusOf(owner);
    expect(seen.unseenReportDate).toBeNull();
    expect(chooseHomeView(seen)).toBe("today");
  });
});
