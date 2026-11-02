import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { morningReports, todos } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { insertUser } from "#src/assistant/mail/testing/insert-account.ts";
import { readReport } from "./read-report.ts";

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await db.close();
});

describe("readReport", () => {
  it("does not show a to-do that has not started as needing the owner", async () => {
    const userId = await insertUser(db);
    const [waiting, started, closed] = await db
      .insert(todos)
      .values([
        { userId, title: "Pay", startDate: "2026-11-08" },
        { userId, title: "Sign", startDate: "2026-11-02" },
        {
          userId,
          title: "Renew",
          startDate: "2026-11-08",
          doneAt: new Date("2026-11-02T09:00:00Z"),
        },
      ])
      .returning();
    await db.insert(morningReports).values({
      userId,
      localDate: "2026-11-02",
      content: {
        version: 2,
        mailDate: "2026-11-01",
        status: "written",
        headline: "A day.",
        needsAction: [waiting, started, closed].map(({ title, id }) => ({
          text: title,
          source: null,
          todoId: id,
        })),
        worthKnowing: [],
        rest: null,
        agenda: null,
        mailCount: 0,
        ranOutOfTime: false,
        unreadMailboxes: [],
        doneTodos: [],
      },
      builtAt: new Date("2026-11-02T09:00:00Z"),
    });

    const report = await readReport({ db, userId }, null);

    expect(report?.needsAction.map((line) => line.text)).toEqual([
      "Sign",
      "Renew",
    ]);
    expect(report?.todos.map((todo) => todo.id)).toEqual([waiting.id]);
  });
});
