import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { todos } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { insertUser } from "#src/assistant/mail/testing/insert-account.ts";
import { callAgentTool } from "../agent-tool.ts";
import { createTodoTools } from "./create-todo-tools.ts";
import { readOpenTodos } from "./read-open-todos.ts";
import { applyChanges, NOW } from "./test-todo-tools.ts";

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await db.close();
});

describe("the to-do tools", () => {
  it("close one occurrence of a repeating to-do, and cannot set or end its rule", async () => {
    const userId = await insertUser(db);
    const rule = { kind: "weekly", every: 1, weekdays: [1] } as const;
    const [bill] = await db
      .insert(todos)
      .values({
        userId,
        title: "Pay",
        dueDate: "2026-11-02",
        repeat: rule,
        ownerEditedFields: ["dueDate"],
      })
      .returning();
    const { tools, changes } = createTodoTools({
      openTodos: await readOpenTodos({ db, userId }),
      deletedTodos: [],
      rejectedTodos: [],
      sourceOf: () => ({ accountId: "a", messageId: "<m@x>" }),
      receivedAtOf: () => NOW,
    });

    expect(await callAgentTool(tools.list_todos, {})).toMatchObject({
      todos: [{ todo: "t1", repeats: "every week on Monday" }],
    });
    expect(
      JSON.stringify(
        await callAgentTool(tools.update_todo, {
          reason: "In the mail.",
          todo: "t1",
          repeat: { kind: "daily", every: 1 },
        }),
      ),
    ).toContain("at least one field");

    await callAgentTool(tools.complete_todo, { todo: "t1", reason: "Paid." });
    expect(
      JSON.stringify(
        await callAgentTool(tools.add_todo, {
          reason: "In the mail.",
          title: "pay",
        }),
      ),
    ).toContain("comes by itself");

    await applyChanges(db, userId, changes);

    const rows = await db.select().from(todos).where(eq(todos.userId, userId));
    expect(rows).toHaveLength(2);
    const next = rows.find((row) => row.id !== bill.id);
    expect(next).toMatchObject({
      title: "Pay",
      dueDate: "2026-11-09",
      repeat: rule,
      doneAt: null,
      ownerEditedFields: ["dueDate"],
    });
    expect(rows.find((row) => row.id === bill.id)).toMatchObject({
      doneReason: "Paid.",
      nextTodoId: next?.id,
    });
  });

  it("make no next occurrence of a to-do that the owner closed during the run", async () => {
    const userId = await insertUser(db);
    const [bill] = await db
      .insert(todos)
      .values({
        userId,
        title: "Pay",
        dueDate: "2026-11-02",
        repeat: { kind: "daily", every: 1 },
      })
      .returning();
    const { tools, changes } = createTodoTools({
      openTodos: await readOpenTodos({ db, userId }),
      deletedTodos: [],
      rejectedTodos: [],
      sourceOf: () => ({ accountId: "a", messageId: "<m@x>" }),
      receivedAtOf: () => NOW,
    });
    await callAgentTool(tools.complete_todo, { todo: "t1", reason: "Paid." });
    await db.update(todos).set({ doneAt: NOW }).where(eq(todos.id, bill.id));

    await applyChanges(db, userId, changes);

    expect(await db.$count(todos, eq(todos.userId, userId))).toBe(1);
  });
});
