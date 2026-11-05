import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { todos } from "#src/assistant/db/schema.ts";
import {
  NOW,
  db,
  owner,
  stranger,
  handlers,
  request,
  stored,
  setUpTodoHandlers,
} from "./test-make-todo-handlers.ts";

setUpTodoHandlers();

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
