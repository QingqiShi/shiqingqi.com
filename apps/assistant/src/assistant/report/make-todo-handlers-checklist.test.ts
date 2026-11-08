import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { todoChecklistItems, todos } from "#src/assistant/db/schema.ts";
import { listTodos } from "./read-report.ts";
import {
  NOW,
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

      await handlers.bulk(request("POST", { action: "done", ids: [id] }));
      await handlers.bulk(request("POST", { action: "reopen", ids: [id] }));

      expect(await stored(id)).toMatchObject({
        doneAt: null,
        waitingOn: "Alice",
      });
    });
  });
});
