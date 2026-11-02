import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { todos } from "#src/assistant/db/schema.ts";
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
