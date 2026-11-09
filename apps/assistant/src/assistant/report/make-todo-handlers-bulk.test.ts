import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { todos } from "#src/assistant/db/schema.ts";
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

describe("the owner's to-do requests", () => {
  describe("bulk", () => {
    it("closes all, and one undo restores every row", async () => {
      const first = await insertTodo(owner);
      const second = await insertTodo(owner);

      const closed = await handlers.bulk(
        request("POST", { action: "done", ids: [first.id, second.id] }),
      );

      expect(closed.status).toBe(200);
      expect(await stored(first.id)).toMatchObject({ doneAt: NOW });
      expect(await stored(second.id)).toMatchObject({ doneAt: NOW });

      const { closed: ids } = z
        .object({ closed: z.array(z.string()) })
        .parse(await closed.json());
      const undone = await handlers.bulk(
        request("POST", { action: "reopen", ids }),
      );

      expect(undone.status).toBe(204);
      expect(await stored(first.id)).toMatchObject({ doneAt: null });
      expect(await stored(second.id)).toMatchObject({ doneAt: null });
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
          ids: [open.id, doneId],
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
          ids,
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
});
