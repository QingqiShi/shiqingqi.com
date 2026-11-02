import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { morningReports, todos } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { insertUser } from "#src/assistant/mail/testing/insert-account.ts";
import { callAgentTool } from "../agent-tool.ts";
import {
  applyTodoChanges,
  createTodoTools,
  readOpenTodos,
} from "./create-todo-tools.ts";

const NOW = new Date("2026-11-01T09:00:00Z");

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await db.close();
});

describe("the to-do tools", () => {
  it("know only the user's open to-dos, and write only the user's rows", async () => {
    const owner = await insertUser(db);
    const stranger = await insertUser(db);
    const [pay, call, foreign] = await db
      .insert(todos)
      .values([
        { userId: owner, title: "Pay the invoice" },
        { userId: owner, title: "Call the bank" },
        { userId: stranger, title: "Pay the invoice" },
      ])
      .returning();
    const openTodos = await readOpenTodos({ db, userId: owner });
    expect(openTodos.map((todo) => todo.id).sort()).toEqual(
      [pay.id, call.id].sort(),
    );
    const { tools, changes } = createTodoTools({
      openTodos,
      sourceOf: () => ({ accountId: "a", messageId: "<m@x>" }),
    });
    const key = (id: string) =>
      `t${String(openTodos.findIndex((todo) => todo.id === id) + 1)}`;

    expect(
      JSON.stringify(
        await callAgentTool(tools.complete_todo, {
          todo: foreign.id,
          reason: "A mail says so.",
        }),
      ),
    ).toContain("Unknown to-do");
    expect(
      JSON.stringify(
        await callAgentTool(tools.add_todo, { title: "pay the  invoice" }),
      ),
    ).toContain("has that title already");
    await callAgentTool(tools.complete_todo, {
      todo: key(pay.id),
      reason: "The receipt came.",
    });
    await callAgentTool(tools.update_todo, {
      todo: key(call.id),
      dueDate: "2026-11-03",
    });
    await callAgentTool(tools.add_todo, { title: "Sign the form" });

    // The owner ticks "Call the bank" off while the run goes on.
    await db.update(todos).set({ doneAt: NOW }).where(eq(todos.id, call.id));
    const [report] = await db
      .insert(morningReports)
      .values({
        userId: owner,
        localDate: "2026-11-01",
        content: {
          version: 2,
          mailDate: "2026-10-31",
          status: "written",
          headline: "A day.",
          needsAction: [],
          worthKnowing: [],
          rest: null,
          agenda: null,
          mailCount: 0,
          ranOutOfTime: false,
          unreadMailboxes: [],
          doneTodos: [],
        },
        builtAt: NOW,
      })
      .returning();
    await db.transaction((tx) =>
      applyTodoChanges(tx, {
        userId: owner,
        reportId: report.id,
        now: NOW,
        changes,
      }),
    );

    const rows = await db.select().from(todos);
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get(pay.id)?.doneAt).toEqual(NOW);
    expect(byId.get(call.id)).toMatchObject({ dueDate: null, doneAt: NOW });
    expect(byId.get(foreign.id)).toMatchObject({
      title: "Pay the invoice",
      dueDate: null,
      doneAt: null,
    });
    expect(
      rows
        .filter((row) => row.title === "Sign the form")
        .map((row) => row.userId),
    ).toEqual([owner]);
  });
});
