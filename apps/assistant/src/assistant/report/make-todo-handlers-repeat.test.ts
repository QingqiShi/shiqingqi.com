import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { todos, userSettings } from "#src/assistant/db/schema.ts";
import { makeTodoHandlers } from "./make-todo-handlers.ts";
import {
  db,
  owner,
  stranger,
  handlers,
  request,
  insertTodo,
  stored,
  setUpTodoHandlers,
} from "./test-make-todo-handlers.ts";

setUpTodoHandlers();

describe("a repeating to-do", () => {
  const MONTHLY = { kind: "monthly", every: 1, day: 15 } as const;

  async function insertRepeating(userId: string) {
    const [row] = await db
      .insert(todos)
      .values({
        userId,
        title: "Pay rent",
        detail: "Flat 2",
        dueDate: "2026-11-15",
        startDate: "2026-11-10",
        repeat: MONTHLY,
        ownerEditedFields: ["title", "dueDate"],
        sourceMessageId: "<rent@x>",
      })
      .returning();
    return row;
  }

  function close(id: string, nextId: string = randomUUID()) {
    return handlers.update(request("PATCH", { done: true, nextId }), id);
  }

  async function ownRows(userId: string) {
    return db.select().from(todos).where(eq(todos.userId, userId));
  }

  it("closes into a next occurrence with the same text and start offset, in its place", async () => {
    const first = await insertRepeating(owner);
    const later = await insertTodo(owner, "Later");
    const nextId = randomUUID();

    expect((await close(first.id, nextId)).status).toBe(204);

    expect(await stored(nextId)).toMatchObject({
      userId: owner,
      title: "Pay rent",
      detail: "Flat 2",
      dueDate: "2026-12-15",
      startDate: "2026-12-10",
      repeat: MONTHLY,
      createdBy: "owner",
      doneAt: null,
      position: first.position,
      sourceMessageId: null,
    });
    expect((await stored(nextId)).ownerEditedFields.toSorted()).toEqual([
      "dueDate",
      "title",
    ]);
    const closed = await stored(first.id);
    expect(closed.doneAt).not.toBeNull();
    expect(closed.nextTodoId).toBe(nextId);
    expect(closed.position).toBeGreaterThan(later.position);
  });

  it("makes one next occurrence when the same close is sent twice", async () => {
    const first = await insertRepeating(owner);
    const nextId = randomUUID();

    await close(first.id, nextId);
    await close(first.id, nextId);
    await close(first.id);

    expect(await ownRows(owner)).toHaveLength(2);
  });

  it("counts the day it was done in the owner's time zone", async () => {
    await db
      .insert(userSettings)
      .values({ userId: owner, timeZone: "Asia/Shanghai" });
    const late = new Date("2026-11-02T20:00:00Z");
    const shanghai = makeTodoHandlers({
      isConfigured: () => true,
      getDb: () => db,
      getCalendarDeps: () => null,
      getSession: () =>
        Promise.resolve({ sessionId: randomUUID(), userId: owner }),
      now: () => late,
    });
    const [row] = await db
      .insert(todos)
      .values({
        userId: owner,
        title: "Water",
        repeat: { kind: "after-done", days: 2 },
      })
      .returning();
    const nextId = randomUUID();

    await shanghai.update(request("PATCH", { done: true, nextId }), row.id);

    expect((await stored(nextId)).dueDate).toBe("2026-11-05");
  });

  it("takes the next occurrence away on undo, with no deleted row for the agent to read", async () => {
    const first = await insertRepeating(owner);
    const nextId = randomUUID();
    await close(first.id, nextId);

    await handlers.update(request("PATCH", { done: false }), first.id);

    expect(await ownRows(owner)).toHaveLength(1);
    expect(await stored(first.id)).toMatchObject({
      doneAt: null,
      nextTodoId: null,
      repeat: MONTHLY,
      position: first.position,
    });
  });

  it("reopens as a one-off when the next occurrence is done too, so the series does not run twice", async () => {
    const first = await insertRepeating(owner);
    const nextId = randomUUID();
    await close(first.id, nextId);
    await close(nextId);

    await handlers.update(request("PATCH", { done: false }), first.id);

    expect(await stored(first.id)).toMatchObject({
      doneAt: null,
      repeat: null,
      nextTodoId: null,
    });
    expect(await stored(nextId)).toMatchObject({ repeat: MONTHLY });
    expect((await stored(nextId)).doneAt).not.toBeNull();
  });

  it("leaves no series behind when deleted, and comes back whole on restore", async () => {
    const first = await insertRepeating(owner);

    await handlers.delete(request("DELETE"), first.id);
    expect((await close(first.id)).status).toBe(404);
    expect(await ownRows(owner)).toHaveLength(1);

    await handlers.restore(request("POST"), first.id);
    expect(await stored(first.id)).toMatchObject({
      deletedAt: null,
      repeat: MONTHLY,
    });
  });

  it("refuses a next id that another user's to-do has, and stays open", async () => {
    const first = await insertRepeating(owner);
    const theirs = await insertTodo(stranger);

    expect((await close(first.id, theirs.id)).status).toBe(409);

    expect(await stored(first.id)).toMatchObject({
      doneAt: null,
      nextTodoId: null,
      position: first.position,
    });
    expect(await stored(theirs.id)).toMatchObject({ userId: stranger });
  });

  it("moves an occurrence that is skipped, or back, and the dates do not become the owner's", async () => {
    const [row] = await db
      .insert(todos)
      .values({
        userId: owner,
        title: "Pay",
        dueDate: "2026-11-15",
        repeat: MONTHLY,
      })
      .returning();
    const move = (dueDate: string) =>
      handlers.moveOccurrence(
        request("PUT", { dueDate, startDate: null }),
        row.id,
      );

    expect((await move("2026-12-15")).status).toBe(204);

    expect(await stored(row.id)).toMatchObject({
      dueDate: "2026-12-15",
      doneAt: null,
      ownerEditedFields: [],
    });
    expect(await ownRows(owner)).toHaveLength(1);
  });

  it("refuses to skip what does not repeat, what is done, or what is someone else's", async () => {
    const once = await insertTodo(owner);
    const done = await insertRepeating(owner);
    await close(done.id);
    const theirs = await insertRepeating(stranger);
    const body = { dueDate: "2026-12-15", startDate: null };

    for (const id of [once.id, done.id, theirs.id]) {
      const response = await handlers.moveOccurrence(request("PUT", body), id);
      expect(response.status).toBe(404);
    }
    expect(await stored(theirs.id)).toMatchObject({ dueDate: "2026-11-15" });
  });

  it("makes the due date the owner's when the owner sets a rule, and refuses a bad rule", async () => {
    const { id } = await insertTodo(owner);

    for (const repeat of [
      { kind: "weekly", every: 1, weekdays: [] },
      { kind: "weekly", every: 1, weekdays: [3, 1] },
      { kind: "daily", every: 0 },
      { kind: "monthly", every: 1, day: 32 },
      { kind: "hourly", every: 1 },
    ]) {
      expect(
        (await handlers.update(request("PATCH", { repeat }), id)).status,
      ).toBe(400);
    }

    await handlers.update(request("PATCH", { repeat: MONTHLY }), id);

    expect(await stored(id)).toMatchObject({
      repeat: MONTHLY,
      ownerEditedFields: ["dueDate"],
    });
  });
});
