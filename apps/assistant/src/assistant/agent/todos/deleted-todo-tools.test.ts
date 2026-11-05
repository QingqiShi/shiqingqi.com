import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { todos } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { insertUser } from "#src/assistant/mail/testing/insert-account.ts";
import { callAgentTool } from "../agent-tool.ts";
import { createTodoTools } from "./create-todo-tools.ts";
import {
  readDeletedTodos,
  readOpenTodos,
  readRejectedTodos,
} from "./read-open-todos.ts";
import { NOW } from "./test-todo-tools.ts";

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await db.close();
});

describe("the to-do tools", () => {
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
        rejectedTodos: [],
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
        await callAgentTool(run.tools.add_todo, {
          reason: "In the mail.",
          ...input,
        }),
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

  describe("rejected to-dos", () => {
    const REJECTED_MAIL = {
      accountId: "00000000-0000-4000-8000-00000000000a",
      messageId: "<rejected@example.com>",
    };
    const OTHER_MAIL = {
      accountId: "00000000-0000-4000-8000-00000000000a",
      messageId: "<other@example.com>",
    };

    async function add(input: Record<string, string>) {
      const run = createTodoTools({
        openTodos: [],
        deletedTodos: [],
        rejectedTodos: [
          {
            id: "00000000-0000-4000-8000-000000000002",
            title: "Read the  newsletter",
            note: "Newsletters never need a to-do",
            source: REJECTED_MAIL,
          },
        ],
        sourceOf: (id) => (id === "m1" ? REJECTED_MAIL : OTHER_MAIL),
        receivedAtOf: () => NOW,
      });
      const output = JSON.stringify(
        await callAgentTool(run.tools.add_todo, {
          reason: "In the mail.",
          ...input,
        }),
      );
      return { output, added: run.changes.added };
    }

    it("refuses the title and the mail of a rejected to-do, and takes others", async () => {
      expect(
        (await add({ title: "read the newsletter", mail: "m2" })).output,
      ).toContain("should not have been added");
      expect(
        (await add({ title: "Something else", mail: "m1" })).added,
      ).toEqual([]);
      expect(
        (await add({ title: "Something else", mail: "m2" })).added,
      ).toHaveLength(1);
    });

    it("reads the user's rejections of the last 90 days, apart from the deleted to-dos", async () => {
      const owner = await insertUser(db);
      const stranger = await insertUser(db);
      const DELETED_AT = new Date("2026-10-30T09:00:00Z");
      const recent = new Date(NOW.getTime() - 89 * 86_400_000);
      await db.insert(todos).values([
        {
          userId: owner,
          title: "Rejected",
          deletedAt: recent,
          rejectedAt: recent,
          rejectionNote: "Not this kind",
        },
        {
          userId: owner,
          title: "Long ago",
          deletedAt: new Date(NOW.getTime() - 91 * 86_400_000),
          rejectedAt: new Date(NOW.getTime() - 91 * 86_400_000),
        },
        {
          userId: stranger,
          title: "Theirs",
          deletedAt: recent,
          rejectedAt: recent,
        },
        { userId: owner, title: "Only deleted", deletedAt: DELETED_AT },
        {
          userId: owner,
          title: "Rejected today",
          deletedAt: DELETED_AT,
          rejectedAt: DELETED_AT,
        },
      ]);

      const scope = { db, userId: owner };

      expect(await readRejectedTodos(scope, NOW)).toMatchObject([
        { title: "Rejected today", note: null },
        { title: "Rejected", note: "Not this kind" },
      ]);
      expect(
        (await readDeletedTodos(scope, NOW)).map((todo) => todo.title),
      ).toEqual(["Only deleted"]);
    });
  });
});
