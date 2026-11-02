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
});
