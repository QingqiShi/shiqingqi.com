import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  morningReports,
  todoChecklistItems,
  todos,
} from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { insertUser } from "#src/assistant/mail/testing/insert-account.ts";
import { listDoneTodos, readReport, searchTodos } from "./read-report.ts";

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

describe("searchTodos", () => {
  async function titlesFound(userId: string, term: string) {
    const { todos: found } = await searchTodos({ db, userId }, term);
    return found.map((todo) => todo.title);
  }

  it("finds the text in a title, a detail or a step, open or done, in any case", async () => {
    const userId = await insertUser(db);
    const [, , withStep] = await db
      .insert(todos)
      .values([
        { userId, title: "Pay the INVOICE" },
        { userId, title: "Call", detail: "ask about the invoice" },
        { userId, title: "Tax" },
        {
          userId,
          title: "Old invoice",
          doneAt: new Date("2026-10-01T09:00:00Z"),
        },
        {
          userId,
          title: "Older invoice",
          doneAt: new Date("2026-09-01T09:00:00Z"),
        },
        { userId, title: "Walk" },
      ])
      .returning();
    await db.insert(todoChecklistItems).values({
      id: crypto.randomUUID(),
      userId,
      todoId: withStep.id,
      text: "Find the invoice",
    });

    expect(await titlesFound(userId, "invoice")).toEqual([
      "Pay the INVOICE",
      "Call",
      "Tax",
      "Old invoice",
      "Older invoice",
    ]);
  });

  it("takes % and _ and a backslash as themselves", async () => {
    const userId = await insertUser(db);
    await db.insert(todos).values([
      { userId, title: "Save 50% more" },
      { userId, title: "Save 500 more" },
      { userId, title: "file_name" },
      { userId, title: "filename" },
      { userId, title: "C:\\temp" },
      { userId, title: "C:temp" },
    ]);

    expect(await titlesFound(userId, "50%")).toEqual(["Save 50% more"]);
    expect(await titlesFound(userId, "file_")).toEqual(["file_name"]);
    expect(await titlesFound(userId, "C:\\")).toEqual(["C:\\temp"]);
  });

  it("does not find a deleted to-do or a to-do of another user", async () => {
    const userId = await insertUser(db);
    const stranger = await insertUser(db);
    const [, theirs] = await db
      .insert(todos)
      .values([
        { userId, title: "Secret", deletedAt: new Date() },
        { userId: stranger, title: "Theirs" },
      ])
      .returning();
    await db.insert(todoChecklistItems).values({
      id: crypto.randomUUID(),
      userId: stranger,
      todoId: theirs.id,
      text: "Secret step",
    });

    expect(await titlesFound(userId, "secret")).toEqual([]);
  });
});

describe("listDoneTodos", () => {
  it("gives the last page for a page after it, with the newest done first", async () => {
    const userId = await insertUser(db);
    const stranger = await insertUser(db);
    await db.insert(todos).values([
      ...Array.from({ length: 31 }, (_, index) => ({
        userId,
        title: `Done ${String(index)}`,
        doneAt: new Date(Date.UTC(2026, 9, index + 1)),
      })),
      { userId, title: "Open" },
      { userId, title: "Deleted", doneAt: new Date(), deletedAt: new Date() },
      { userId: stranger, title: "Theirs", doneAt: new Date() },
    ]);

    const first = await listDoneTodos({ db, userId }, 1);
    expect(first).toMatchObject({ page: 1, pageCount: 2 });
    expect(first.todos).toHaveLength(30);
    expect(first.todos[0].title).toBe("Done 30");

    const beyond = await listDoneTodos({ db, userId }, 9);
    expect(beyond.page).toBe(2);
    expect(beyond.todos.map((todo) => todo.title)).toEqual(["Done 0"]);
  });
});
