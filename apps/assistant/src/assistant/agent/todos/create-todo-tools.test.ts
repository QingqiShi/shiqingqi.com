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
  readDeletedTodos,
  readOpenTodos,
  type TodoChanges,
} from "./create-todo-tools.ts";

const NOW = new Date("2026-11-01T09:00:00Z");

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await db.close();
});

async function applyChanges(userId: string, changes: TodoChanges) {
  const [report] = await db
    .insert(morningReports)
    .values({
      userId,
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
      userId,
      reportId: report.id,
      now: NOW,
      changes,
    }),
  );
}

describe("the to-do tools", () => {
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
      sourceOf: () => ({ accountId: "a", messageId: "<m@x>" }),
      receivedAtOf: () => NOW,
    });
    const refusal = async (name: string, input: Record<string, unknown>) =>
      JSON.stringify(await callAgentTool(tools[name], input));

    expect(
      await refusal("add_todo", {
        title: "Sign",
        dueDate: "2026-11-05",
        startDate: "2026-11-06",
      }),
    ).toContain("cannot be after");
    expect(
      await refusal("update_todo", { todo: pay, startDate: "2026-11-11" }),
    ).toContain("after its due date");
    expect(
      await refusal("update_todo", { todo: renew, dueDate: "2026-11-14" }),
    ).toContain("after its due date");
    expect(
      await refusal("update_todo", { todo: renew, startDate: null }),
    ).toContain("The owner set startDate");
    expect(changes).toEqual({ added: [], done: [], updated: [] });

    await callAgentTool(tools.update_todo, {
      todo: pay,
      startDate: "2026-11-08",
    });
    expect(changes.updated).toEqual([
      {
        id: openTodos[openTodos.findIndex((todo) => todo.title === "Pay")].id,
        edit: { startDate: "2026-11-08" },
      },
    ]);
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
    await applyChanges(userId, {
      added: [],
      done: [],
      updated: [
        { id: row.id, edit: { title: "Pay it", startDate: "2026-11-08" } },
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

    await applyChanges(userId, {
      added: [],
      done: [],
      updated: [
        { id: row.id, edit: { dueDate: "2026-11-20" } },
        { id: row.id, edit: { startDate: "2026-11-10" } },
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
    await applyChanges(owner, changes);

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
          todo: payKey,
          dueDate: "2026-12-01",
        }),
      ),
    ).toContain("The owner set dueDate");
    await callAgentTool(tools.update_todo, { todo: payKey, detail: "Rent" });
    await callAgentTool(tools.update_todo, {
      todo: callKey,
      title: "Call the bank",
      dueDate: "2026-12-01",
    });

    // The owner sets the title of "Call" while the run goes on.
    await db
      .update(todos)
      .set({ title: "Call mum", ownerEditedFields: ["title"] })
      .where(eq(todos.id, call.id));
    await applyChanges(owner, changes);

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
      sourceOf: () => ({ accountId: "a", messageId: "<m@x>" }),
      receivedAtOf: () => NOW,
    });
    await callAgentTool(tools.complete_todo, { todo: "t1", reason: "Paid." });
    await callAgentTool(tools.complete_todo, { todo: "t2", reason: "Sent." });

    await db.update(todos).set({ deletedAt: NOW }).where(eq(todos.id, gone.id));
    await applyChanges(owner, changes);

    const rows = new Map(
      (await db.select().from(todos)).map((row) => [row.id, row]),
    );
    expect(rows.get(gone.id)).toMatchObject({ doneAt: null, doneReason: null });
    expect(rows.get(closed.id)).toMatchObject({
      doneAt: NOW,
      doneReason: "Sent.",
    });
  });

  describe("with a to-do the owner deleted", () => {
    const OLD_MAIL = { accountId: "a", messageId: "<old@x>" };
    const NEW_MAIL = { accountId: "a", messageId: "<new@x>" };
    const DELETED_AT = new Date("2026-10-30T09:00:00Z");

    function toolsOfRun() {
      const mails = new Map([
        [
          "m1",
          { source: OLD_MAIL, receivedAt: new Date("2026-10-20T09:00:00Z") },
        ],
        ["m2", { source: NEW_MAIL, receivedAt: NOW }],
        [
          "m3",
          {
            source: { accountId: "a", messageId: "<before@x>" },
            receivedAt: new Date("2026-10-29T09:00:00Z"),
          },
        ],
      ]);
      const mailOf = (id: string) => {
        const mail = mails.get(id);
        if (!mail) throw new Error(`No mail ${id}`);
        return mail;
      };
      return createTodoTools({
        openTodos: [],
        deletedTodos: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            title: "Pay the  invoice",
            source: OLD_MAIL,
            deletedAt: DELETED_AT,
          },
        ],
        sourceOf: (id) => mailOf(id).source,
        receivedAtOf: (id) => mailOf(id).receivedAt,
      });
    }

    async function add(input: Record<string, string>) {
      const run = toolsOfRun();
      const output = JSON.stringify(
        await callAgentTool(run.tools.add_todo, input),
      );
      return { output, added: run.changes.added };
    }

    it("refuses a new to-do from the mail of the deleted one", async () => {
      expect(
        (await add({ title: "Something else", mail: "m1" })).output,
      ).toContain("deleted a to-do from this mail");
    });

    it("refuses the same title unless it names the deleted to-do and a new mail", async () => {
      expect(
        (await add({ title: "pay the invoice", mail: "m2" })).output,
      ).toContain("deleted a to-do with this title");
      expect(
        (await add({ title: "Pay the invoice", deletedTodo: "d1" })).output,
      ).toContain("needs the new mail");
      expect(
        (await add({ title: "Pay the invoice", deletedTodo: "d1", mail: "m1" }))
          .output,
      ).toContain("deleted a to-do from this mail");
      expect(
        (await add({ title: "Pay the invoice", deletedTodo: "d1", mail: "m3" }))
          .output,
      ).toContain("not new");
      expect(
        (await add({ title: "Pay the invoice", deletedTodo: "d9", mail: "m2" }))
          .output,
      ).toContain("Unknown deleted to-do");
    });

    it("adds the to-do with a reference to the deleted one when a new mail matters more", async () => {
      const { added } = await add({
        title: "Pay the invoice now",
        deletedTodo: "d1",
        mail: "m2",
      });

      expect(added).toMatchObject([
        {
          source: NEW_MAIL,
          reAddsTodoId: "00000000-0000-4000-8000-000000000001",
        },
      ]);
    });

    it("lists only the user's own to-dos of the last 30 days", async () => {
      const owner = await insertUser(db);
      const stranger = await insertUser(db);
      await db.insert(todos).values([
        { userId: owner, title: "Recent", deletedAt: DELETED_AT },
        {
          userId: owner,
          title: "Long ago",
          deletedAt: new Date("2026-09-01T09:00:00Z"),
        },
        { userId: owner, title: "Open" },
        { userId: stranger, title: "Theirs", deletedAt: DELETED_AT },
      ]);

      const deleted = await readDeletedTodos({ db, userId: owner }, NOW);

      expect(deleted.map((todo) => todo.title)).toEqual(["Recent"]);
      expect(
        (await readOpenTodos({ db, userId: owner })).map((todo) => todo.title),
      ).toEqual(["Open"]);
    });
  });
});
