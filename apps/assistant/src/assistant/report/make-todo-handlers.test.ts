import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  todoChecklistItems,
  todos,
  userSettings,
} from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { insertUser } from "#src/assistant/mail/testing/insert-account.ts";
import { makeTodoHandlers } from "./make-todo-handlers.ts";
import { countOpenTodos, listTodos } from "./read-report.ts";

const ORIGIN = "http://localhost:3000";
const NOW = new Date("2026-11-02T09:00:00Z");

let db: TestDb;
let owner: string;
let stranger: string;
let handlers: ReturnType<typeof makeTodoHandlers>;

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db);
  stranger = await insertUser(db);
  handlers = makeTodoHandlers({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () =>
      Promise.resolve({ sessionId: randomUUID(), userId: owner }),
    now: () => NOW,
  });
});

afterEach(async () => {
  await db.close();
});

function request(method: string, body?: unknown) {
  return new Request(`${ORIGIN}/api/todos`, {
    method,
    headers: { Origin: ORIGIN, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function insertTodo(userId: string, title = "Pay") {
  const [row] = await db.insert(todos).values({ userId, title }).returning();
  return row;
}

async function stored(id: string) {
  const [row] = await db.select().from(todos).where(eq(todos.id, id));
  return row;
}

describe("the owner's to-do requests", () => {
  it("add a to-do as the owner's own, with what the owner set", async () => {
    const id = randomUUID();

    const response = await handlers.add(
      request("POST", { id, title: " Call mum ", dueDate: "2026-11-05" }),
    );

    expect(response.status).toBe(201);
    const row = await stored(id);
    expect(row).toMatchObject({
      userId: owner,
      title: "Call mum",
      detail: null,
      dueDate: "2026-11-05",
      createdBy: "owner",
    });
    expect(row.ownerEditedFields.toSorted()).toEqual(["dueDate", "title"]);
  });

  it("refuse an id that another user's to-do has, and leave that to-do", async () => {
    const theirs = await insertTodo(stranger);

    const response = await handlers.add(
      request("POST", { id: theirs.id, title: "Mine now" }),
    );

    expect(response.status).toBe(409);
    expect(await stored(theirs.id)).toMatchObject({
      userId: stranger,
      title: "Pay",
    });
  });

  it("refuse a body with no change or an empty title", async () => {
    const { id } = await insertTodo(owner);

    expect((await handlers.update(request("PATCH", {}), id)).status).toBe(400);
    expect(
      (await handlers.update(request("PATCH", { title: "  " }), id)).status,
    ).toBe(400);
  });

  it("note each field the owner changes, and clear detail and due date", async () => {
    const { id } = await insertTodo(owner);
    await db
      .update(todos)
      .set({ detail: "Rent", dueDate: "2026-11-05" })
      .where(eq(todos.id, id));

    await handlers.update(
      request("PATCH", { title: "Pay rent", detail: "", dueDate: null }),
      id,
    );
    await handlers.update(request("PATCH", { title: "Pay the rent" }), id);

    const row = await stored(id);
    expect(row).toMatchObject({
      title: "Pay the rent",
      detail: null,
      dueDate: null,
      updatedAt: NOW,
    });
    expect(row.ownerEditedFields.toSorted()).toEqual([
      "detail",
      "dueDate",
      "title",
    ]);
  });

  it("note a start date as the owner's, and refuse one after the due date", async () => {
    const { id } = await insertTodo(owner);
    await db
      .update(todos)
      .set({ dueDate: "2026-11-05" })
      .where(eq(todos.id, id));

    const after = await handlers.update(
      request("PATCH", { startDate: "2026-11-06" }),
      id,
    );
    expect(after.status).toBe(409);
    expect(await after.json()).toEqual({ error: "start-after-due" });
    expect((await stored(id)).startDate).toBeNull();
    expect((await stored(id)).ownerEditedFields).toEqual([]);

    expect(
      (await handlers.update(request("PATCH", { startDate: "2026-11-05" }), id))
        .status,
    ).toBe(204);
    expect(await stored(id)).toMatchObject({
      startDate: "2026-11-05",
      ownerEditedFields: ["startDate"],
    });
    expect(
      (await handlers.update(request("PATCH", { dueDate: "2026-11-04" }), id))
        .status,
    ).toBe(409);
    expect(
      (
        await handlers.update(
          request("PATCH", { dueDate: "2026-11-04", startDate: null }),
          id,
        )
      ).status,
    ).toBe(204);
    expect(await stored(id)).toMatchObject({
      dueDate: "2026-11-04",
      startDate: null,
    });
  });

  it("refuse a new to-do that starts after it is due", async () => {
    const response = await handlers.add(
      request("POST", {
        id: randomUUID(),
        title: "Pay",
        dueDate: "2026-11-05",
        startDate: "2026-11-06",
      }),
    );

    expect(response.status).toBe(400);
    expect(await db.select().from(todos)).toEqual([]);
  });

  it("move no due date at all when one would come before its start date", async () => {
    const free = await insertTodo(owner);
    const starting = await insertTodo(owner);
    await db
      .update(todos)
      .set({ dueDate: "2026-11-09", startDate: "2026-11-08" })
      .where(eq(todos.id, starting.id));

    const response = await handlers.changeDueDates(
      request("PATCH", {
        changes: [
          { id: free.id, dueDate: "2026-11-02", ownerSet: true },
          { id: starting.id, dueDate: "2026-11-02", ownerSet: true },
        ],
      }),
    );

    expect(response.status).toBe(409);
    expect((await stored(free.id)).dueDate).toBeNull();
    expect((await stored(starting.id)).dueDate).toBe("2026-11-09");
  });

  it("clear the agent's reason when the owner opens a to-do again", async () => {
    const { id } = await insertTodo(owner);
    await db
      .update(todos)
      .set({ doneAt: NOW, doneReason: "The receipt came." })
      .where(eq(todos.id, id));

    await handlers.update(request("PATCH", { done: false }), id);

    expect(await stored(id)).toMatchObject({ doneAt: null, doneReason: null });
  });

  it("hide a deleted to-do everywhere until it is restored", async () => {
    const { id } = await insertTodo(owner);
    const scope = { db, userId: owner };

    expect((await handlers.delete(request("DELETE"), id)).status).toBe(204);

    expect(await stored(id)).toMatchObject({ deletedAt: NOW });
    expect((await listTodos(scope)).open).toEqual([]);
    expect(await countOpenTodos(scope)).toBe(0);
    expect(
      (await handlers.update(request("PATCH", { done: true }), id)).status,
    ).toBe(404);
    expect((await handlers.delete(request("DELETE"), id)).status).toBe(404);

    expect((await handlers.restore(request("POST"), id)).status).toBe(204);

    expect(await stored(id)).toMatchObject({ deletedAt: null });
    expect((await listTodos(scope)).open.map((todo) => todo.id)).toEqual([id]);
  });

  it("do not reach another user's to-do", async () => {
    const { id } = await insertTodo(stranger);
    await db.update(todos).set({ detail: "Theirs" }).where(eq(todos.id, id));

    for (const response of [
      await handlers.update(request("PATCH", { title: "Mine" }), id),
      await handlers.delete(request("DELETE"), id),
      await handlers.restore(request("POST"), id),
      await handlers.changeDueDates(
        request("PATCH", {
          changes: [{ id, dueDate: "2026-11-05", ownerSet: true }],
        }),
      ),
    ]) {
      expect(response.status).toBe(404);
    }

    expect(await stored(id)).toMatchObject({
      title: "Pay",
      detail: "Theirs",
      dueDate: null,
      deletedAt: null,
      ownerEditedFields: [],
    });
  });

  it("move many due dates, or none when one is not the owner's", async () => {
    const first = await insertTodo(owner, "First");
    const second = await insertTodo(owner, "Second");
    const theirs = await insertTodo(stranger);
    const today = "2026-11-02";

    const refused = await handlers.changeDueDates(
      request("PATCH", {
        changes: [
          { id: first.id, dueDate: today, ownerSet: true },
          { id: theirs.id, dueDate: today, ownerSet: true },
        ],
      }),
    );

    expect(refused.status).toBe(404);
    expect(await stored(first.id)).toMatchObject({ dueDate: null });

    const moved = await handlers.changeDueDates(
      request("PATCH", {
        changes: [
          { id: first.id, dueDate: today, ownerSet: true },
          { id: second.id, dueDate: today, ownerSet: true },
        ],
      }),
    );

    expect(moved.status).toBe(200);
    expect(await stored(second.id)).toMatchObject({
      dueDate: today,
      ownerEditedFields: ["dueDate"],
    });
  });

  it("undo a move of due dates back to each row's earlier state", async () => {
    const fromAgent = await insertTodo(owner, "From the agent");
    const fromOwner = await insertTodo(owner, "From the owner");
    await db
      .update(todos)
      .set({ dueDate: "2026-10-01", ownerEditedFields: ["title"] })
      .where(eq(todos.id, fromAgent.id));
    await db
      .update(todos)
      .set({
        dueDate: "2026-10-02",
        ownerEditedFields: ["dueDate", "title"],
      })
      .where(eq(todos.id, fromOwner.id));

    const moved = await handlers.changeDueDates(
      request("PATCH", {
        changes: [fromAgent, fromOwner].map(({ id }) => ({
          id,
          dueDate: "2026-11-02",
          ownerSet: true,
        })),
      }),
    );
    const { earlier } = z
      .object({ earlier: z.array(z.unknown()) })
      .parse(await moved.json());
    const undone = await handlers.changeDueDates(
      request("PATCH", { changes: earlier }),
    );

    expect(undone.status).toBe(200);
    expect(await stored(fromAgent.id)).toMatchObject({
      dueDate: "2026-10-01",
      ownerEditedFields: ["title"],
    });
    const owners = await stored(fromOwner.id);
    expect(owners.dueDate).toBe("2026-10-02");
    expect(owners.ownerEditedFields.toSorted()).toEqual(["dueDate", "title"]);
  });

  describe("bulk", () => {
    async function insertRepeating(userId: string) {
      const [row] = await db
        .insert(todos)
        .values({
          userId,
          title: "Pay rent",
          dueDate: "2026-11-01",
          repeat: { kind: "monthly", every: 1, day: 1 },
        })
        .returning();
      return row;
    }

    it("closes all with their next occurrences, and one undo restores every row", async () => {
      const plain = await insertTodo(owner);
      const repeating = await insertRepeating(owner);
      const nextId = randomUUID();

      const closed = await handlers.bulk(
        request("POST", {
          action: "done",
          todos: [{ id: plain.id }, { id: repeating.id, nextId }],
        }),
      );

      expect(closed.status).toBe(200);
      expect(await stored(plain.id)).toMatchObject({ doneAt: NOW });
      expect(await stored(repeating.id)).toMatchObject({
        doneAt: NOW,
        nextTodoId: nextId,
      });
      expect(await stored(nextId)).toMatchObject({
        dueDate: "2026-12-01",
        position: repeating.position,
      });

      const { closed: ids } = z
        .object({ closed: z.array(z.string()) })
        .parse(await closed.json());
      const undone = await handlers.bulk(
        request("POST", { action: "reopen", ids }),
      );

      expect(undone.status).toBe(204);
      expect(await stored(plain.id)).toMatchObject({ doneAt: null });
      expect(await stored(repeating.id)).toMatchObject({
        doneAt: null,
        nextTodoId: null,
        position: repeating.position,
        dueDate: "2026-11-01",
        repeat: repeating.repeat,
      });
      expect(await stored(nextId)).toBeUndefined();
    });

    it("does not count a to-do that was done already, so an undo leaves it done", async () => {
      const open = await insertTodo(owner);
      const earlier = new Date("2026-10-01T09:00:00Z");
      const { id: doneId } = await insertTodo(owner);
      await db
        .update(todos)
        .set({ doneAt: earlier })
        .where(eq(todos.id, doneId));

      const closed = await handlers.bulk(
        request("POST", {
          action: "done",
          todos: [{ id: open.id }, { id: doneId }],
        }),
      );

      expect(await closed.json()).toEqual({ closed: [open.id] });
      expect(await stored(doneId)).toMatchObject({ doneAt: earlier });
    });

    it("changes nothing when one of the rows is another user's", async () => {
      const mine = await insertTodo(owner);
      const theirs = await insertTodo(stranger);
      const ids = [mine.id, theirs.id];

      const closed = await handlers.bulk(
        request("POST", {
          action: "done",
          todos: ids.map((id) => ({ id })),
        }),
      );
      const deleted = await handlers.bulk(
        request("POST", { action: "delete", ids }),
      );

      expect(closed.status).toBe(404);
      expect(deleted.status).toBe(404);
      for (const id of ids) {
        expect(await stored(id)).toMatchObject({
          doneAt: null,
          deletedAt: null,
        });
      }
    });

    it("closes none when a next id is taken", async () => {
      const plain = await insertTodo(owner);
      const repeating = await insertRepeating(owner);
      const theirs = await insertTodo(stranger);

      const closed = await handlers.bulk(
        request("POST", {
          action: "done",
          todos: [{ id: plain.id }, { id: repeating.id, nextId: theirs.id }],
        }),
      );

      expect(closed.status).toBe(409);
      expect(await stored(plain.id)).toMatchObject({ doneAt: null });
      expect(await stored(repeating.id)).toMatchObject({
        doneAt: null,
        nextTodoId: null,
      });
    });

    it("deletes all, and restores only the user's own", async () => {
      const first = await insertTodo(owner);
      const second = await insertTodo(owner);
      const ids = [first.id, second.id];
      const theirs = await insertTodo(stranger);
      await db
        .update(todos)
        .set({ deletedAt: NOW })
        .where(eq(todos.id, theirs.id));

      await handlers.bulk(request("POST", { action: "delete", ids }));
      expect(await stored(first.id)).toMatchObject({ deletedAt: NOW });
      expect(await stored(second.id)).toMatchObject({ deletedAt: NOW });

      await handlers.bulk(
        request("POST", { action: "restore", ids: [...ids, theirs.id] }),
      );

      expect(await stored(first.id)).toMatchObject({ deletedAt: null });
      expect(await stored(second.id)).toMatchObject({ deletedAt: null });
      expect(await stored(theirs.id)).toMatchObject({ deletedAt: NOW });
    });

    it("moves a due date before the start date with the start date, and an undo restores both", async () => {
      const { id } = await insertTodo(owner);
      await db
        .update(todos)
        .set({
          dueDate: "2026-11-20",
          startDate: "2026-11-15",
          ownerEditedFields: ["title"],
        })
        .where(eq(todos.id, id));

      const moved = await handlers.changeDueDates(
        request("PATCH", {
          changes: [
            {
              id,
              dueDate: "2026-11-05",
              ownerSet: true,
              start: { date: null, ownerSet: true },
            },
          ],
        }),
      );

      expect(moved.status).toBe(200);
      const after = await stored(id);
      expect(after).toMatchObject({ dueDate: "2026-11-05", startDate: null });
      expect(after.ownerEditedFields.toSorted()).toEqual([
        "dueDate",
        "startDate",
        "title",
      ]);

      const { earlier } = z
        .object({ earlier: z.array(z.unknown()) })
        .parse(await moved.json());
      await handlers.changeDueDates(request("PATCH", { changes: earlier }));

      expect(await stored(id)).toMatchObject({
        dueDate: "2026-11-20",
        startDate: "2026-11-15",
        ownerEditedFields: ["title"],
      });
    });
  });

  describe("a rejection", () => {
    async function insertDeleted(
      userId: string,
      createdBy: "report" | "owner" = "report",
    ) {
      const [row] = await db
        .insert(todos)
        .values({ userId, title: "Read it", createdBy, deletedAt: NOW })
        .returning();
      return row.id;
    }

    function reject(ids: string[], note = "") {
      return handlers.bulk(request("POST", { action: "reject", ids, note }));
    }

    it("stores the note on each deleted to-do of the report's", async () => {
      const first = await insertDeleted(owner);
      const second = await insertDeleted(owner);

      expect((await reject([first, second], " Not this kind ")).status).toBe(
        204,
      );

      expect(await stored(second)).toMatchObject({
        rejectedAt: NOW,
        rejectionNote: "Not this kind",
      });
    });

    it("refuses all when one is the owner's, open or someone else's", async () => {
      const good = await insertDeleted(owner);
      const others = [
        await insertDeleted(owner, "owner"),
        (await insertTodo(owner)).id,
        await insertDeleted(stranger),
      ];

      for (const other of others) {
        expect((await reject([good, other])).status).toBe(404);
      }

      expect(await stored(good)).toMatchObject({ rejectedAt: null });
    });

    it("goes when the to-do comes back, and does not return with a later delete", async () => {
      const one = await insertDeleted(owner);
      const many = await insertDeleted(owner);
      await reject([one, many], "Not this kind");

      await handlers.restore(request("POST"), one);
      await handlers.bulk(request("POST", { action: "restore", ids: [many] }));
      await handlers.delete(request("DELETE"), one);

      expect(await stored(one)).toMatchObject({
        rejectedAt: null,
        rejectionNote: null,
      });
      expect(await stored(many)).toMatchObject({ rejectedAt: null });
    });

    it("can be taken away, only by its user, and the to-do stays deleted", async () => {
      const id = await insertDeleted(owner);
      const theirs = await insertDeleted(stranger);
      await db
        .update(todos)
        .set({ rejectedAt: NOW })
        .where(eq(todos.id, theirs));
      await reject([id], "Not this kind");

      const removed = await handlers.removeRejection(request("DELETE"), id);
      const refused = await handlers.removeRejection(request("DELETE"), theirs);

      expect(removed.status).toBe(204);
      expect(refused.status).toBe(404);
      expect(await stored(id)).toMatchObject({
        rejectedAt: null,
        rejectionNote: null,
        deletedAt: NOW,
      });
      expect(await stored(theirs)).toMatchObject({ rejectedAt: NOW });
    });
  });

  describe("order", () => {
    async function insertOpen(userId: string, ...titles: string[]) {
      const rows = [];
      for (const title of titles) rows.push(await insertTodo(userId, title));
      return rows;
    }

    const openTitles = async (userId: string) =>
      (await listTodos({ db, userId })).open.map((todo) => todo.title);

    it("puts a new to-do last", async () => {
      await insertOpen(owner, "First", "Second");

      await handlers.add(request("POST", { id: randomUUID(), title: "New" }));

      expect(await openTitles(owner)).toEqual(["First", "Second", "New"]);
    });

    it("swaps only the listed to-dos, so that others keep their places", async () => {
      const [a, , c, d] = await insertOpen(owner, "A", "B", "C", "D");

      const response = await handlers.reorder(
        request("PUT", { ids: [d.id, a.id, c.id] }),
      );

      expect(response.status).toBe(204);
      expect(await openTitles(owner)).toEqual(["D", "B", "A", "C"]);
    });

    it("ignores a to-do that is another user's or deleted, and leaves it", async () => {
      const [a, b, c] = await insertOpen(owner, "A", "B", "C");
      const [theirs] = await insertOpen(stranger, "Theirs");
      await handlers.delete(request("DELETE"), b.id);

      const response = await handlers.reorder(
        request("PUT", { ids: [theirs.id, c.id, b.id, a.id] }),
      );

      expect(response.status).toBe(204);
      expect(await openTitles(owner)).toEqual(["C", "A"]);
      expect((await stored(theirs.id)).position).toBe(theirs.position);
      expect((await stored(b.id)).position).toBe(b.position);
    });

    it("refuses a list with an id twice", async () => {
      const [a, b] = await insertOpen(owner, "A", "B");

      const response = await handlers.reorder(
        request("PUT", { ids: [b.id, a.id, b.id] }),
      );

      expect(response.status).toBe(400);
      expect(await openTitles(owner)).toEqual(["A", "B"]);
    });
  });
});

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

describe("a reminder", () => {
  const LATER = "2026-11-02T15:00:00.000Z";
  const PASSED = "2026-11-02T08:00:00.000Z";
  const setReminder = (id: string, remindAt: string | null) =>
    handlers.update(request("PATCH", { remindAt }), id);

  async function insertReminder(values: Partial<typeof todos.$inferInsert>) {
    const [row] = await db
      .insert(todos)
      .values({ userId: owner, title: "Pay", ...values })
      .returning();
    return row;
  }

  it("waits to be sent when it is set, also after an earlier one went out", async () => {
    const { id } = await insertReminder({
      remindAt: new Date(PASSED),
      remindedAt: new Date(PASSED),
      snoozedUntil: new Date(PASSED),
    });

    expect((await setReminder(id, LATER)).status).toBe(204);

    expect(await stored(id)).toMatchObject({
      remindAt: new Date(LATER),
      remindedAt: null,
      snoozedUntil: null,
    });
  });

  it("does not go out when its time has passed already", async () => {
    const { id } = await insertReminder({});

    await setReminder(id, PASSED);

    expect((await stored(id)).remindedAt).toEqual(NOW);
  });

  it("is not a field that the agent must leave alone, and it can go", async () => {
    const { id } = await insertReminder({});

    await setReminder(id, LATER);
    expect((await stored(id)).ownerEditedFields).toEqual([]);

    await setReminder(id, null);
    expect((await stored(id)).remindAt).toBeNull();
  });

  it("refuses a time that is not a time", async () => {
    const { id } = await insertReminder({});

    for (const remindAt of ["tomorrow", "2026-11-02", "2026-11-02T15:00"]) {
      const response = await handlers.update(
        request("PATCH", { remindAt }),
        id,
      );
      expect(response.status).toBe(400);
    }
  });

  it("snoozes for an hour, again after it went out, and keeps the time asked for", async () => {
    const { id } = await insertReminder({
      remindAt: new Date(PASSED),
      remindedAt: new Date(PASSED),
    });

    expect((await handlers.snoozeReminder(request("POST"), id)).status).toBe(
      204,
    );

    expect(await stored(id)).toMatchObject({
      remindAt: new Date(PASSED),
      remindedAt: null,
      snoozedUntil: new Date(NOW.getTime() + 3_600_000),
    });
  });

  it("refuses to snooze what is done, deleted, without a reminder, or someone else's", async () => {
    const remindAt = new Date(PASSED);
    const rows = await Promise.all([
      insertReminder({ remindAt, doneAt: NOW }),
      insertReminder({ remindAt, deletedAt: NOW }),
      insertReminder({}),
      insertReminder({ remindAt, userId: stranger }),
    ]);

    for (const { id } of rows) {
      const response = await handlers.snoozeReminder(request("POST"), id);
      expect(response.status).toBe(404);
      expect((await stored(id)).snoozedUntil).toBeNull();
    }
  });

  it("carries to the next occurrence without the snooze, and goes when the next one goes", async () => {
    const { id } = await insertReminder({
      dueDate: "2026-11-02",
      remindAt: new Date(LATER),
      snoozedUntil: new Date("2026-11-02T16:00:00.000Z"),
      repeat: { kind: "daily", every: 1 },
    });
    const nextId = randomUUID();

    await handlers.update(request("PATCH", { done: true, nextId }), id);

    expect(await stored(nextId)).toMatchObject({
      dueDate: "2026-11-03",
      remindAt: new Date("2026-11-03T15:00:00.000Z"),
      snoozedUntil: null,
      remindedAt: null,
    });

    await handlers.update(request("PATCH", { done: false }), id);

    expect(await stored(nextId)).toBeUndefined();
    expect(await stored(id)).toMatchObject({ remindAt: new Date(LATER) });
  });

  it("does not fire at once on a next occurrence whose time has passed, and keeps the owner's clock", async () => {
    const { id } = await insertReminder({
      dueDate: "2026-10-26",
      remindAt: new Date("2026-10-20T09:00:00.000Z"),
      repeat: { kind: "weekly", every: 1, weekdays: [3] },
    });
    const nextId = randomUUID();

    await handlers.update(request("PATCH", { done: true, nextId }), id);

    expect(await stored(nextId)).toMatchObject({
      dueDate: "2026-11-04",
      remindAt: new Date("2026-10-29T10:00:00.000Z"),
      remindedAt: NOW,
    });
  });

  it("moves with a skip", async () => {
    const { id } = await insertReminder({
      dueDate: "2026-11-02",
      remindAt: new Date(LATER),
      repeat: { kind: "daily", every: 1 },
    });

    const response = await handlers.moveOccurrence(
      request("PUT", {
        dueDate: "2026-11-03",
        startDate: null,
        remindAt: "2026-11-03T15:00:00.000Z",
      }),
      id,
    );

    expect(response.status).toBe(204);
    expect(await stored(id)).toMatchObject({
      remindAt: new Date("2026-11-03T15:00:00.000Z"),
      remindedAt: null,
    });
  });
});

describe("the checklist of a to-do", () => {
  async function addStep(todoId: string, text: string, ticked = false) {
    const id = randomUUID();
    const response = await handlers.addStep(
      request("POST", { id, text, done: ticked }),
      todoId,
    );
    expect(response.status).toBe(201);
    return id;
  }

  async function checklist(todoId: string) {
    const { open, done } = await listTodos({ db, userId: owner });
    const todo = [...open, ...done].find((row) => row.id === todoId);
    return todo?.checklist.map(({ text, done: ticked }) => [text, ticked]);
  }

  it("does not close the to-do when every step is ticked", async () => {
    const todo = await insertTodo(owner);
    const step = await addStep(todo.id, "Find the invoice");

    await handlers.changeStep(request("PATCH", { done: true }), todo.id, step);

    expect(await checklist(todo.id)).toEqual([["Find the invoice", true]]);
    expect((await stored(todo.id)).doneAt).toBeNull();
  });

  it("lets nobody reach the steps of another user or of a deleted to-do", async () => {
    const theirs = await insertTodo(stranger);
    const [theirStep, otherStep] = [randomUUID(), randomUUID()];
    await db.insert(todoChecklistItems).values([
      { id: theirStep, userId: stranger, todoId: theirs.id, text: "A" },
      { id: otherStep, userId: stranger, todoId: theirs.id, text: "B" },
    ]);
    const steps = () =>
      db
        .select()
        .from(todoChecklistItems)
        .where(eq(todoChecklistItems.todoId, theirs.id))
        .orderBy(todoChecklistItems.position);
    const before = await steps();

    const answers = await Promise.all([
      handlers.addStep(
        request("POST", { id: randomUUID(), text: "Mine" }),
        theirs.id,
      ),
      handlers.changeStep(
        request("PATCH", { text: "Mine" }),
        theirs.id,
        theirStep,
      ),
      handlers.deleteStep(request("DELETE"), theirs.id, theirStep),
    ]);
    await handlers.reorderSteps(
      request("PUT", { ids: [otherStep, theirStep] }),
      theirs.id,
    );

    expect(answers.map(({ status }) => status)).toEqual([404, 404, 404]);
    expect(await steps()).toEqual(before);

    const mine = await insertTodo(owner);
    const step = await addStep(mine.id, "Gone with it");
    await handlers.delete(request("DELETE"), mine.id);
    expect(
      (
        await handlers.changeStep(
          request("PATCH", { done: true }),
          mine.id,
          step,
        )
      ).status,
    ).toBe(404);
  });

  it("keeps the place of a deleted step when the undo sends it back", async () => {
    const todo = await insertTodo(owner);
    await addStep(todo.id, "First");
    const middle = await addStep(todo.id, "Middle", true);
    await addStep(todo.id, "Last");

    const answer = await handlers.deleteStep(
      request("DELETE"),
      todo.id,
      middle,
    );
    const { position } = z
      .object({ position: z.number() })
      .parse(await answer.json());
    expect(await checklist(todo.id)).toEqual([
      ["First", false],
      ["Last", false],
    ]);

    await handlers.addStep(
      request("POST", { id: middle, text: "Middle", done: true, position }),
      todo.id,
    );

    expect(await checklist(todo.id)).toEqual([
      ["First", false],
      ["Middle", true],
      ["Last", false],
    ]);
  });

  it("orders the steps of one to-do and leaves the others as they are", async () => {
    const todo = await insertTodo(owner);
    const [a, b, c] = [
      await addStep(todo.id, "A"),
      await addStep(todo.id, "B"),
      await addStep(todo.id, "C"),
    ];

    await handlers.reorderSteps(request("PUT", { ids: [c, a, b] }), todo.id);
    await handlers.reorderSteps(request("PUT", { ids: [a, c] }), todo.id);

    expect((await checklist(todo.id))?.map(([text]) => text)).toEqual([
      "A",
      "C",
      "B",
    ]);
  });

  it("gives the next occurrence the steps with no ticks, and takes them away on a reopen", async () => {
    const [first] = await db
      .insert(todos)
      .values({
        userId: owner,
        title: "Pay rent",
        dueDate: "2026-11-05",
        repeat: { kind: "monthly", every: 1, day: 5 },
      })
      .returning();
    await addStep(first.id, "Check the amount", true);
    await addStep(first.id, "Send it");
    const nextId = randomUUID();

    await handlers.update(request("PATCH", { done: true, nextId }), first.id);

    expect(await checklist(nextId)).toEqual([
      ["Check the amount", false],
      ["Send it", false],
    ]);
    expect(await checklist(first.id)).toEqual([
      ["Check the amount", true],
      ["Send it", false],
    ]);

    await handlers.update(request("PATCH", { done: false }), first.id);

    expect(
      await db.$count(
        todoChecklistItems,
        eq(todoChecklistItems.todoId, nextId),
      ),
    ).toBe(0);
    expect(await checklist(first.id)).toEqual([
      ["Check the amount", true],
      ["Send it", false],
    ]);
  });

  it("takes the ticks away on a skip, and its undo gives them back", async () => {
    const [todo] = await db
      .insert(todos)
      .values({
        userId: owner,
        title: "Pay rent",
        dueDate: "2026-11-05",
        repeat: { kind: "monthly", every: 1, day: 5 },
      })
      .returning();
    const ticked = await addStep(todo.id, "Check the amount", true);

    await handlers.moveOccurrence(
      request("PUT", { dueDate: "2026-12-05", startDate: null }),
      todo.id,
    );
    expect(await checklist(todo.id)).toEqual([["Check the amount", false]]);

    await handlers.moveOccurrence(
      request("PUT", {
        dueDate: "2026-11-05",
        startDate: null,
        ticked: [ticked],
      }),
      todo.id,
    );
    expect(await checklist(todo.id)).toEqual([["Check the amount", true]]);
  });

  describe("waiting", () => {
    const put = (todoId: string, body: unknown) =>
      handlers.changeWaiting(request("PUT", body), todoId);

    it("makes the wait the owner's, from now on, and ends it the same way", async () => {
      const { id } = await insertTodo(owner);

      const marked = await put(id, {
        waitingOn: " Alice ",
        followUpDate: "2026-11-05",
      });

      expect(marked.status).toBe(200);
      const row = await stored(id);
      expect(row).toMatchObject({
        waitingOn: "Alice",
        followUpDate: "2026-11-05",
        waitingSince: NOW,
      });
      expect(row.ownerEditedFields.toSorted()).toEqual([
        "followUpDate",
        "waitingOn",
      ]);

      await put(id, { waitingOn: null, followUpDate: null });

      expect(await stored(id)).toMatchObject({
        waitingOn: null,
        followUpDate: null,
        waitingSince: null,
      });
    });

    it("keeps when a wait began when only its follow-up date changes", async () => {
      const since = new Date("2026-10-30T09:00:00Z");
      const { id } = await insertTodo(owner);
      await db
        .update(todos)
        .set({
          waitingOn: "Alice",
          waitingSince: since,
          waitingNote: "She said so.",
        })
        .where(eq(todos.id, id));

      await put(id, { waitingOn: "Alice", followUpDate: "2026-11-05" });

      const row = await stored(id);
      expect(row).toMatchObject({
        followUpDate: "2026-11-05",
        waitingSince: since,
        waitingNote: "She said so.",
      });
      expect(row.ownerEditedFields).toEqual(["followUpDate"]);
    });

    it("undoes a change to exactly what the wait was, also whose it was", async () => {
      const since = new Date("2026-10-30T09:00:00Z");
      const { id } = await insertTodo(owner);
      await db
        .update(todos)
        .set({
          waitingOn: "Alice",
          followUpDate: "2026-11-05",
          waitingSince: since,
          waitingNote: "She said so.",
          ownerEditedFields: ["title"],
        })
        .where(eq(todos.id, id));

      const response = await put(id, { waitingOn: null, followUpDate: null });
      const { earlier } = z
        .object({ earlier: z.object({}).loose() })
        .parse(await response.json());
      await put(id, { restore: earlier });

      expect(await stored(id)).toMatchObject({
        waitingOn: "Alice",
        followUpDate: "2026-11-05",
        waitingSince: since,
        waitingNote: "She said so.",
        ownerEditedFields: ["title"],
      });
    });

    it("reaches only the user's own to-dos, and needs someone to follow up on", async () => {
      const theirs = await insertTodo(stranger);
      const mine = await insertTodo(owner);

      const strangers = await put(theirs.id, {
        waitingOn: "Alice",
        followUpDate: null,
      });
      const noOne = await put(mine.id, {
        waitingOn: null,
        followUpDate: "2026-11-05",
      });

      expect(strangers.status).toBe(404);
      expect((await stored(theirs.id)).waitingOn).toBeNull();
      expect(noOne.status).toBe(400);
    });

    it("comes back with the to-do when the owner undoes a close of many", async () => {
      const { id } = await insertTodo(owner);
      await put(id, { waitingOn: "Alice", followUpDate: null });

      await handlers.bulk(request("POST", { action: "done", todos: [{ id }] }));
      await handlers.bulk(request("POST", { action: "reopen", ids: [id] }));

      expect(await stored(id)).toMatchObject({
        doneAt: null,
        waitingOn: "Alice",
      });
    });
  });
});
