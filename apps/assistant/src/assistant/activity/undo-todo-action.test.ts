import { randomUUID } from "node:crypto";
import { and, eq, isNotNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyTodoChanges } from "#src/assistant/agent/todos/apply-todo-changes.ts";
import {
  readDeletedTodos,
  readOpenTodos,
  readRejectedTodos,
} from "#src/assistant/agent/todos/read-open-todos.ts";
import type { TodoChanges } from "#src/assistant/agent/todos/types.ts";
import { createFakeCalendarServer } from "#src/assistant/calendar/testing/create-fake-calendar-server.ts";
import {
  agentActions,
  agentRuns,
  morningReports,
  todos,
} from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { createFakeMailServer } from "#src/assistant/mail/testing/create-fake-mail-server.ts";
import {
  insertAccount,
  insertUser,
  mailDeps,
} from "#src/assistant/mail/testing/insert-account.ts";
import { ownerTodos } from "#src/assistant/report/owner-todos.ts";
import { listUndoneForAgent } from "./list-undone-for-agent.ts";
import { undoAgentActions, type UndoDeps } from "./undo-agent-actions.ts";

const NOW = new Date("2026-11-02T08:00:00Z");
const LATER = new Date("2026-11-02T12:00:00Z");
const NO_CHANGES: TodoChanges = { added: [], done: [], updated: [] };

let db: TestDb;
let userId: string;
let scope: { db: TestDb; userId: string };

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  scope = { db, userId };
});

afterEach(async () => {
  await db.close();
});

function deps(): UndoDeps {
  const credentials = { user: "me@icloud.com", password: "app-password" };
  return {
    ...mailDeps({
      connector: createFakeMailServer(credentials).connector,
      now: () => LATER,
    }),
    calendarConnector: createFakeCalendarServer(credentials).connector,
  };
}

/** Applies the changes as the report does, and gives the id of the run. */
async function applyChanges(changes: Partial<TodoChanges>) {
  const [report] = await db
    .insert(morningReports)
    .values({
      userId,
      localDate: "2026-11-02",
      content: {
        version: 2,
        mailDate: "2026-11-01",
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
    .onConflictDoUpdate({
      target: [morningReports.userId, morningReports.localDate],
      set: { builtAt: NOW },
    })
    .returning();
  const [run] = await db
    .insert(agentRuns)
    .values({ userId, task: "report", modelId: "test", startedAt: NOW })
    .returning();
  await db.transaction((tx) =>
    applyTodoChanges(tx, {
      userId,
      reportId: report.id,
      runId: run.id,
      now: NOW,
      changes: { ...NO_CHANGES, ...changes },
      calendar: null,
    }),
  );
  return run.id;
}

function undo(runId: string) {
  return undoAgentActions({ db, userId, now: () => LATER }, deps(), { runId });
}

async function readTodo(id: string) {
  const rows = await db.select().from(todos).where(eq(todos.id, id));
  return rows.at(0);
}

function newTodo(title: string) {
  return {
    id: randomUUID(),
    title,
    detail: null,
    dueDate: null,
    startDate: null,
    source: null,
    reAddsTodoId: null,
    reason: "A mail asks.",
  };
}

async function insertTodo(values: Partial<typeof todos.$inferInsert> = {}) {
  const [row] = await db
    .insert(todos)
    .values({ userId, title: "Pay the invoice", ...values })
    .returning();
  return row;
}

describe("undo of an add", () => {
  it("soft-deletes the row, which the agent hears of as an undo and not as a deletion or a rejection", async () => {
    const added = newTodo("Sign the form");
    const runId = await applyChanges({ added: [added] });

    expect((await undo(runId))?.at(0)).toMatchObject({ undone: true });

    expect((await readTodo(added.id))?.deletedAt).toEqual(LATER);
    expect(await readOpenTodos(scope)).toEqual([]);
    expect(await readDeletedTodos(scope, LATER)).toEqual([]);
    expect(await readRejectedTodos(scope, LATER)).toEqual([]);
    expect(await listUndoneForAgent(scope, LATER, "todos")).toEqual([
      'adding the to-do "Sign the form"',
    ]);
  });

  it("leaves a to-do that the owner has made their own", async () => {
    const added = newTodo("Sign the form");
    const runId = await applyChanges({ added: [added] });
    await ownerTodos.change(
      scope,
      null,
      added.id,
      { dueDate: "2026-11-09" },
      NOW,
    );

    expect((await undo(runId))?.at(0)).toMatchObject({
      undone: false,
      refusal: "todo-changed",
    });

    expect((await readTodo(added.id))?.deletedAt).toBeNull();
    const undone = await db
      .select()
      .from(agentActions)
      .where(isNotNull(agentActions.undoneAt));
    expect(undone).toEqual([]);
  });

  it("leaves a to-do that holds time on the owner's calendar", async () => {
    const added = newTodo("Sign the form");
    const runId = await applyChanges({ added: [added] });
    await db
      .update(todos)
      .set({
        calendarAccountId: await insertAccount(db, userId),
        calendarUrl: "https://caldav.example/home/calendar-1/",
        calendarHref: "https://caldav.example/home/calendar-1/a.ics",
        calendarStart: LATER,
        calendarEnd: LATER,
      })
      .where(eq(todos.id, added.id));

    expect((await undo(runId))?.at(0)).toMatchObject({
      undone: false,
      refusal: "todo-changed",
    });
    expect((await readTodo(added.id))?.deletedAt).toBeNull();
  });

  it("keeps the owner's delete as the owner's", async () => {
    const added = newTodo("Sign the form");
    const runId = await applyChanges({ added: [added] });
    await ownerTodos.delete(scope, null, added.id, NOW);

    await undo(runId);

    expect((await readDeletedTodos(scope, LATER)).map(({ id }) => id)).toEqual([
      added.id,
    ]);
  });
});

describe("undo of an update", () => {
  const edit = { title: "Pay it", dueDate: "2026-11-05" };

  it("returns each field to what it was, also after two updates in one run", async () => {
    const todo = await insertTodo({ dueDate: "2026-11-03" });
    const runId = await applyChanges({
      updated: [
        { id: todo.id, edit, reason: "First." },
        { id: todo.id, edit: { dueDate: "2026-11-06" }, reason: "Second." },
      ],
    });

    await undo(runId);

    const row = await readTodo(todo.id);
    expect(row?.title).toBe("Pay the invoice");
    expect(row?.dueDate).toBe("2026-11-03");
  });

  it("changes nothing on a field the owner changed since, and the rest go back", async () => {
    const todo = await insertTodo({ dueDate: "2026-11-03" });
    const runId = await applyChanges({
      updated: [{ id: todo.id, edit, reason: "It moved." }],
    });
    await ownerTodos.change(
      scope,
      null,
      todo.id,
      { dueDate: "2026-11-05" },
      NOW,
    );

    await undo(runId);

    const row = await readTodo(todo.id);
    expect(row?.title).toBe("Pay the invoice");
    expect(row?.dueDate).toBe("2026-11-05");
    const [action] = await db.select().from(agentActions);
    expect(action.undoneAt).toEqual(LATER);
    expect(action.detail).toMatchObject({ undo: { kept: ["dueDate"] } });
  });

  it("is refused when every field changed since", async () => {
    const todo = await insertTodo({ dueDate: "2026-11-03" });
    const runId = await applyChanges({
      updated: [{ id: todo.id, edit: { dueDate: "2026-11-05" }, reason: "R" }],
    });
    await applyChanges({
      updated: [{ id: todo.id, edit: { dueDate: "2026-11-06" }, reason: "R" }],
    });

    expect((await undo(runId))?.at(0)).toMatchObject({
      undone: false,
      refusal: "todo-changed",
    });
    expect((await readTodo(todo.id))?.dueDate).toBe("2026-11-06");
  });

  it("does not put dates out of order", async () => {
    const todo = await insertTodo({ dueDate: "2026-11-03" });
    const runId = await applyChanges({
      updated: [
        { id: todo.id, edit: { dueDate: "2026-11-10" }, reason: "It moved." },
      ],
    });
    await ownerTodos.change(
      scope,
      null,
      todo.id,
      { startDate: "2026-11-08" },
      NOW,
    );

    expect((await undo(runId))?.at(0)).toMatchObject({
      refusal: "todo-changed",
    });
    expect((await readTodo(todo.id))?.dueDate).toBe("2026-11-10");
  });
});

describe("undo of a completion", () => {
  const done = (id: string) => ({
    id,
    title: "Pay the invoice",
    reason: "It is paid.",
  });

  it("puts back the wait that the completion ended", async () => {
    const since = new Date("2026-11-01T08:00:00Z");
    const todo = await insertTodo({
      waitingOn: "Sam",
      waitingSince: since,
      followUpDate: "2026-11-09",
      waitingNote: "Sam will reply.",
    });
    const runId = await applyChanges({
      done: [{ ...done(todo.id), mailAt: NOW.toISOString() }],
    });

    await undo(runId);

    expect(await readTodo(todo.id)).toMatchObject({
      doneAt: null,
      waitingOn: "Sam",
      waitingSince: since,
      followUpDate: "2026-11-09",
      waitingNote: "Sam will reply.",
    });
  });

  it("does not reopen a to-do that the owner closed again", async () => {
    const todo = await insertTodo();
    const runId = await applyChanges({
      done: [{ ...done(todo.id) }],
    });
    await ownerTodos.change(scope, null, todo.id, { done: false }, NOW);
    await ownerTodos.change(scope, null, todo.id, { done: true }, LATER);

    expect((await undo(runId))?.at(0)).toMatchObject({
      undone: false,
      refusal: "todo-changed",
    });
    expect((await readTodo(todo.id))?.doneAt).toEqual(LATER);
  });
});

describe("undo of a wait", () => {
  const since = new Date("2026-11-01T08:00:00Z");

  it("takes off the wait that the agent marked", async () => {
    const todo = await insertTodo();
    const runId = await applyChanges({
      waiting: [
        {
          id: todo.id,
          waitingOn: "Sam",
          followUpDate: "2026-11-09",
          since: since.toISOString(),
          reason: "Sam will reply.",
        },
      ],
    });

    await undo(runId);

    expect(await readTodo(todo.id)).toMatchObject({
      waitingOn: null,
      waitingSince: null,
      followUpDate: null,
      waitingNote: null,
    });
  });

  async function endOwnersWait() {
    const todo = await insertTodo();
    await ownerTodos.changeWaiting(
      scope,
      todo.id,
      { waitingOn: "Sam", followUpDate: null },
      since,
    );
    const runId = await applyChanges({
      replied: [
        { id: todo.id, reason: "Sam wrote.", mailAt: NOW.toISOString() },
      ],
    });
    return { todoId: todo.id, runId };
  }

  it("puts back a wait of the owner's that a reply ended", async () => {
    const { todoId, runId } = await endOwnersWait();

    await undo(runId);

    expect(await readTodo(todoId)).toMatchObject({
      waitingOn: "Sam",
      waitingSince: since,
      waitingNote: null,
      ownerEditedFields: ["waitingOn"],
    });
  });

  it("leaves a new wait that the owner made after the reply", async () => {
    const { todoId, runId } = await endOwnersWait();
    await ownerTodos.changeWaiting(
      scope,
      todoId,
      { waitingOn: "Kim", followUpDate: null },
      LATER,
    );

    expect((await undo(runId))?.at(0)).toMatchObject({
      refusal: "todo-changed",
    });
    expect((await readTodo(todoId))?.waitingOn).toBe("Kim");
  });
});

describe("the actions of a run", () => {
  it("name only what the run really changed", async () => {
    const closed = await insertTodo({ doneAt: NOW });
    const owned = await insertTodo({ ownerEditedFields: ["dueDate"] });
    await applyChanges({
      updated: [
        { id: closed.id, edit: { title: "Late" }, reason: "R" },
        { id: owned.id, edit: { dueDate: "2026-11-05" }, reason: "R" },
      ],
    });

    expect(await db.select().from(agentActions)).toEqual([]);
  });

  it("keep what the owner undid apart for each agent", async () => {
    const added = newTodo("Sign the form");
    const runId = await applyChanges({ added: [added] });
    await db.insert(agentActions).values({
      runId,
      userId,
      kind: "move",
      subject: "A receipt",
      fromFolder: "INBOX",
      toFolder: "Receipts",
      reason: "A receipt.",
      undoneAt: LATER,
    });
    await db
      .update(agentActions)
      .set({ undoneAt: LATER })
      .where(
        and(eq(agentActions.runId, runId), eq(agentActions.kind, "add_todo")),
      );

    expect(await listUndoneForAgent(scope, LATER, "todos")).toEqual([
      'adding the to-do "Sign the form"',
    ]);
    expect(await listUndoneForAgent(scope, LATER, "mail-and-calendar")).toEqual(
      ['moving "A receipt" from "INBOX" to "Receipts"'],
    );
  });
});
