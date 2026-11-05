import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { todos } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { insertUser } from "#src/assistant/mail/testing/insert-account.ts";
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
  describe("with a to-do that waits", () => {
    const WAIT_BEGAN = new Date("2026-10-30T09:00:00Z");
    const receivedAtOf = (id: string) =>
      id === "old" ? new Date("2026-10-29T09:00:00Z") : NOW;

    async function run(userId: string) {
      return createTodoTools({
        openTodos: await readOpenTodos({ db, userId }),
        deletedTodos: [],
        rejectedTodos: [],
        sourceOf: () => ({ accountId: "a", messageId: "<m@x>" }),
        receivedAtOf,
      });
    }

    async function insertWaiting(
      userId: string,
      ownerEditedFields: ("waitingOn" | "followUpDate")[] = ["waitingOn"],
    ) {
      const [row] = await db
        .insert(todos)
        .values({
          userId,
          title: "Get the quote",
          waitingOn: "Alice",
          followUpDate: "2026-11-05",
          waitingSince: WAIT_BEGAN,
          ownerEditedFields,
        })
        .returning();
      return row;
    }

    const storedRow = async (id: string) =>
      (await db.select().from(todos).where(eq(todos.id, id))).at(0);

    it("marks a to-do as waiting from the time of the mail, and keeps why", async () => {
      const userId = await insertUser(db);
      const [row] = await db
        .insert(todos)
        .values({ userId, title: "Get the quote" })
        .returning();
      const { tools, changes } = await run(userId);

      await callAgentTool(tools.mark_waiting, {
        todo: "t1",
        waitingOn: "Alice",
        followUpDate: "2026-11-05",
        mail: "new",
        reason: "Alice says she will answer this week.",
      });
      await applyChanges(db, userId, changes);

      expect(await storedRow(row.id)).toMatchObject({
        waitingOn: "Alice",
        followUpDate: "2026-11-05",
        waitingSince: NOW,
        waitingNote: "Alice says she will answer this week.",
        ownerEditedFields: [],
      });
    });

    it("cannot change a wait that the owner set or ended, also during the run", async () => {
      const userId = await insertUser(db);
      await insertWaiting(userId);
      const [ended] = await db
        .insert(todos)
        .values({ userId, title: "Ended", ownerEditedFields: ["waitingOn"] })
        .returning();
      const [free] = await db
        .insert(todos)
        .values({ userId, title: "Free" })
        .returning();
      const { tools, changes } = await run(userId);
      const mark = (todo: string) =>
        callAgentTool(tools.mark_waiting, {
          todo,
          waitingOn: "Bob",
          mail: "new",
          reason: "Bob will answer.",
        });

      expect(JSON.stringify(await mark("t1"))).toContain("The owner set");
      expect(JSON.stringify(await mark("t2"))).toContain("The owner set");
      await mark("t3");
      await db
        .update(todos)
        .set({
          waitingOn: "Carol",
          waitingSince: NOW,
          ownerEditedFields: ["waitingOn"],
        })
        .where(eq(todos.id, free.id));
      await applyChanges(db, userId, changes);

      expect(await storedRow(free.id)).toMatchObject({ waitingOn: "Carol" });
      expect(await storedRow(ended.id)).toMatchObject({ waitingOn: null });
    });

    it("takes only a mail from after the wait began as the reply, also on a wait the owner set", async () => {
      const userId = await insertUser(db);
      const row = await insertWaiting(userId);
      const { tools, changes } = await run(userId);
      const reply = (mail: string) =>
        callAgentTool(tools.reply_came, {
          todo: "t1",
          mail,
          reason: "Alice sent the quote; compare it.",
        });

      expect(JSON.stringify(await reply("old"))).toContain("not the reply");
      expect(
        JSON.stringify(
          await callAgentTool(tools.complete_todo, {
            todo: "t1",
            reason: "Settled.",
            mail: "old",
          }),
        ),
      ).toContain("not the reply");
      expect(
        JSON.stringify(
          await callAgentTool(tools.complete_todo, {
            todo: "t1",
            reason: "Settled.",
          }),
        ),
      ).toContain("give the mail");

      await reply("new");
      await applyChanges(db, userId, changes);

      expect(await storedRow(row.id)).toMatchObject({
        waitingOn: null,
        followUpDate: null,
        waitingSince: null,
        waitingNote: "Alice sent the quote; compare it.",
        doneAt: null,
        ownerEditedFields: ["waitingOn"],
      });
    });

    it("ends the wait when the reply closes the to-do", async () => {
      const userId = await insertUser(db);
      const row = await insertWaiting(userId);
      const { tools, changes } = await run(userId);

      await db
        .update(todos)
        .set({ waitingNote: "She will answer." })
        .where(eq(todos.id, row.id));
      await callAgentTool(tools.complete_todo, {
        todo: "t1",
        reason: "Alice sent the quote.",
        mail: "new",
      });
      await applyChanges(db, userId, changes);

      expect(await storedRow(row.id)).toMatchObject({
        waitingOn: null,
        waitingSince: null,
        waitingNote: null,
        doneAt: NOW,
        doneReason: "Alice sent the quote.",
      });
    });

    it("does not end a wait that the owner began during the run by an older mail", async () => {
      const userId = await insertUser(db);
      const [closing, moving] = await db
        .insert(todos)
        .values([
          { userId, title: "A" },
          {
            userId,
            title: "B",
            waitingOn: "Alice",
            waitingSince: WAIT_BEGAN,
          },
        ])
        .returning();
      const { tools, changes } = await run(userId);
      await callAgentTool(tools.complete_todo, {
        todo: "t1",
        reason: "Done.",
        mail: "new",
      });
      await callAgentTool(tools.reply_came, {
        todo: "t2",
        reason: "It came.",
        mail: "new",
      });
      const later = new Date(NOW.getTime() + 60_000);
      await db
        .update(todos)
        .set({ waitingOn: "Bob", waitingSince: later })
        .where(eq(todos.userId, userId));

      await applyChanges(db, userId, changes);

      expect(await storedRow(closing.id)).toMatchObject({
        waitingOn: "Bob",
        doneAt: null,
      });
      expect(await storedRow(moving.id)).toMatchObject({ waitingOn: "Bob" });
    });

    it("leaves the wait out of a next occurrence", async () => {
      const userId = await insertUser(db);
      const [row] = await db
        .insert(todos)
        .values({
          userId,
          title: "Get the rent receipt",
          dueDate: "2026-11-02",
          repeat: { kind: "monthly", every: 1, day: 2 },
          waitingOn: "The landlord",
          waitingSince: WAIT_BEGAN,
          ownerEditedFields: ["dueDate", "waitingOn"],
        })
        .returning();
      const { tools, changes } = await run(userId);

      await callAgentTool(tools.complete_todo, {
        todo: "t1",
        reason: "The receipt came.",
        mail: "new",
      });
      await applyChanges(db, userId, changes);

      const closed = await storedRow(row.id);
      expect(await storedRow(closed?.nextTodoId ?? "")).toMatchObject({
        waitingOn: null,
        waitingSince: null,
        ownerEditedFields: ["dueDate"],
      });
    });
  });
});
