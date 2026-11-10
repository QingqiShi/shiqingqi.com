import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { todoChecklistItems, todos } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import {
  insertAccount,
  insertUser,
} from "#src/assistant/mail/testing/insert-account.ts";
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
  it("show each to-do's own checklist, in the owner's order", async () => {
    const userId = await insertUser(db);
    const [pay, other] = await db
      .insert(todos)
      .values([
        { userId, title: "Pay" },
        { userId, title: "Renew" },
      ])
      .returning();
    const [first, second] = [randomUUID(), randomUUID()];
    await db.insert(todoChecklistItems).values([
      { id: first, userId, todoId: pay.id, text: "Later", position: 2 },
      {
        id: second,
        userId,
        todoId: pay.id,
        text: "Sooner",
        done: true,
        position: 1,
      },
    ]);
    const { tools } = createTodoTools({
      openTodos: await readOpenTodos({ db, userId }),
      deletedTodos: [],
      rejectedTodos: [],
      sourceOf: () => ({ accountId: "a", messageId: "<m@x>" }),
      receivedAtOf: () => NOW,
    });

    const listed = z
      .object({
        todos: z.array(z.object({ title: z.string(), checklist: z.unknown() })),
      })
      .parse(await callAgentTool(tools.list_todos, {}));

    expect(
      listed.todos.find(({ title }) => title === "Pay")?.checklist,
    ).toEqual([
      { text: "Sooner", done: true },
      { text: "Later", done: false },
    ]);
    expect(
      listed.todos.find(({ title }) => title === other.title)?.checklist,
    ).toEqual([]);
  });

  it("refuse a start date after the due date, also of the dates a to-do has", async () => {
    const userId = await insertUser(db);
    await db.insert(todos).values([
      { userId, title: "Pay", dueDate: "2026-11-10" },
      {
        userId,
        title: "Renew",
        dueDate: "2026-11-20",
        startDate: "2026-11-15",
        ownerEditedFields: ["startDate"],
      },
    ]);
    const openTodos = await readOpenTodos({ db, userId });
    const pay = `t${String(openTodos.findIndex((todo) => todo.title === "Pay") + 1)}`;
    const renew = `t${String(openTodos.findIndex((todo) => todo.title === "Renew") + 1)}`;
    const { tools, changes } = createTodoTools({
      openTodos,
      deletedTodos: [],
      rejectedTodos: [],
      sourceOf: () => ({ accountId: "a", messageId: "<m@x>" }),
      receivedAtOf: () => NOW,
    });
    const refusal = async (name: string, input: Record<string, unknown>) =>
      JSON.stringify(await callAgentTool(tools[name], input));

    expect(
      await refusal("add_todo", {
        reason: "In the mail.",
        title: "Sign",
        dueDate: "2026-11-05",
        startDate: "2026-11-06",
      }),
    ).toContain("cannot be after");
    expect(
      await refusal("update_todo", {
        reason: "In the mail.",
        todo: pay,
        startDate: "2026-11-11",
      }),
    ).toContain("after its due date");
    expect(
      await refusal("update_todo", {
        reason: "In the mail.",
        todo: renew,
        dueDate: "2026-11-14",
      }),
    ).toContain("after its due date");
    expect(
      await refusal("update_todo", {
        reason: "In the mail.",
        todo: renew,
        startDate: null,
      }),
    ).toContain("The owner set startDate");
    expect(changes).toEqual({
      added: [],
      done: [],
      updated: [],
      waiting: [],
      replied: [],
    });

    await callAgentTool(tools.update_todo, {
      reason: "In the mail.",
      todo: pay,
      startDate: "2026-11-08",
    });
    expect(changes.updated).toEqual([
      {
        id: openTodos[openTodos.findIndex((todo) => todo.title === "Pay")].id,
        reason: "In the mail.",
        edit: { startDate: "2026-11-08" },
      },
    ]);
  });

  it("make a to-do open the later mail that says how to act", async () => {
    const userId = await insertUser(db);
    const accountId = await insertAccount(db, userId);
    const [todo] = await db
      .insert(todos)
      .values({
        userId,
        title: "Return the router",
        sourceAccountId: accountId,
        sourceMessageId: "<switching@x>",
      })
      .returning();
    const { tools, changes } = createTodoTools({
      openTodos: await readOpenTodos({ db, userId }),
      deletedTodos: [],
      rejectedTodos: [],
      sourceOf: () => ({ accountId, messageId: "<how-to-return@x>" }),
      receivedAtOf: () => NOW,
    });

    await callAgentTool(tools.update_todo, {
      reason: "The return mail gives the steps.",
      todo: "t1",
      detail: "Free at the Post Office.",
      mail: "m2",
    });
    await applyChanges(db, userId, changes);

    const [row] = await db.select().from(todos).where(eq(todos.id, todo.id));
    expect(row.sourceMessageId).toBe("<how-to-return@x>");
  });

  it("leave the dates as they are when the owner's new date no longer fits the run's", async () => {
    const userId = await insertUser(db);
    const [row] = await db
      .insert(todos)
      .values({ userId, title: "Pay", dueDate: "2026-11-20" })
      .returning();

    // The run saw a due date of the 20th. The owner moves it to the 5th.
    await db
      .update(todos)
      .set({ dueDate: "2026-11-05", ownerEditedFields: ["dueDate"] })
      .where(eq(todos.id, row.id));
    await applyChanges(db, userId, {
      added: [],
      done: [],
      updated: [
        {
          id: row.id,
          reason: "In the mail.",
          edit: { title: "Pay it", startDate: "2026-11-08" },
        },
      ],
    });

    const [after] = await db.select().from(todos).where(eq(todos.id, row.id));
    expect(after).toMatchObject({
      title: "Pay it",
      dueDate: "2026-11-05",
      startDate: null,
    });
  });

  it("apply a start date and a due date from separate edits in order", async () => {
    const userId = await insertUser(db);
    const [row] = await db
      .insert(todos)
      .values({ userId, title: "Pay", dueDate: "2026-11-05" })
      .returning();

    await applyChanges(db, userId, {
      added: [],
      done: [],
      updated: [
        { id: row.id, reason: "In the mail.", edit: { dueDate: "2026-11-20" } },
        {
          id: row.id,
          reason: "In the mail.",
          edit: { startDate: "2026-11-10" },
        },
      ],
    });

    const [after] = await db.select().from(todos).where(eq(todos.id, row.id));
    expect(after).toMatchObject({
      dueDate: "2026-11-20",
      startDate: "2026-11-10",
    });
  });

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
      deletedTodos: [],
      rejectedTodos: [],
      sourceOf: () => ({ accountId: "a", messageId: "<m@x>" }),
      receivedAtOf: () => NOW,
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
        await callAgentTool(tools.add_todo, {
          reason: "In the mail.",
          title: "pay the  invoice",
        }),
      ),
    ).toContain("has that title already");
    await callAgentTool(tools.complete_todo, {
      todo: key(pay.id),
      reason: "The receipt came.",
    });
    await callAgentTool(tools.update_todo, {
      reason: "In the mail.",
      todo: key(call.id),
      dueDate: "2026-11-03",
    });
    await callAgentTool(tools.add_todo, {
      reason: "In the mail.",
      title: "Sign the form",
    });

    // The owner ticks "Call the bank" off while the run goes on.
    await db.update(todos).set({ doneAt: NOW }).where(eq(todos.id, call.id));
    await applyChanges(db, owner, changes);

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

  it("leave what the owner set, also when the owner sets it during the run", async () => {
    const owner = await insertUser(db);
    const [pay, call] = await db
      .insert(todos)
      .values([
        { userId: owner, title: "Pay", ownerEditedFields: ["dueDate"] },
        { userId: owner, title: "Call" },
      ])
      .returning();
    const openTodos = await readOpenTodos({ db, userId: owner });
    const { tools, changes, idOf } = createTodoTools({
      openTodos,
      deletedTodos: [],
      rejectedTodos: [],
      sourceOf: () => ({ accountId: "a", messageId: "<m@x>" }),
      receivedAtOf: () => NOW,
    });
    const keys = ["t1", "t2"];
    const payKey = keys.find((key) => idOf(key) === pay.id) ?? "";
    const callKey = keys.find((key) => idOf(key) === call.id) ?? "";

    expect(JSON.stringify(await callAgentTool(tools.list_todos, {}))).toContain(
      '"ownerSet":["dueDate"]',
    );
    expect(
      JSON.stringify(
        await callAgentTool(tools.update_todo, {
          reason: "In the mail.",
          todo: payKey,
          dueDate: "2026-12-01",
        }),
      ),
    ).toContain("The owner set dueDate");
    await callAgentTool(tools.update_todo, {
      reason: "In the mail.",
      todo: payKey,
      detail: "Rent",
    });
    await callAgentTool(tools.update_todo, {
      reason: "In the mail.",
      todo: callKey,
      title: "Call the bank",
      dueDate: "2026-12-01",
    });

    // The owner sets the title of "Call" while the run goes on.
    await db
      .update(todos)
      .set({ title: "Call mum", ownerEditedFields: ["title"] })
      .where(eq(todos.id, call.id));
    await applyChanges(db, owner, changes);

    const rows = new Map(
      (await db.select().from(todos)).map((row) => [row.id, row]),
    );
    expect(rows.get(pay.id)).toMatchObject({ dueDate: null, detail: "Rent" });
    expect(rows.get(call.id)).toMatchObject({
      title: "Call mum",
      dueDate: "2026-12-01",
      updatedAt: NOW,
    });
  });

  it("skip a to-do that the owner deleted during the run, and store why they closed one", async () => {
    const owner = await insertUser(db);
    const [gone, closed] = await db
      .insert(todos)
      .values([
        {
          userId: owner,
          title: "Gone",
          createdAt: new Date(NOW.getTime() - 1),
        },
        { userId: owner, title: "Closed", createdAt: NOW },
      ])
      .returning();
    const { tools, changes } = createTodoTools({
      openTodos: await readOpenTodos({ db, userId: owner }),
      deletedTodos: [],
      rejectedTodos: [],
      sourceOf: () => ({ accountId: "a", messageId: "<m@x>" }),
      receivedAtOf: () => NOW,
    });
    await callAgentTool(tools.complete_todo, { todo: "t1", reason: "Paid." });
    await callAgentTool(tools.complete_todo, { todo: "t2", reason: "Sent." });

    await db.update(todos).set({ deletedAt: NOW }).where(eq(todos.id, gone.id));
    await applyChanges(db, owner, changes);

    const rows = new Map(
      (await db.select().from(todos)).map((row) => [row.id, row]),
    );
    expect(rows.get(gone.id)).toMatchObject({ doneAt: null, doneReason: null });
    expect(rows.get(closed.id)).toMatchObject({
      doneAt: NOW,
      doneReason: "Sent.",
    });
  });
});
