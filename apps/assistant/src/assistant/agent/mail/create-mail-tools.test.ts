import { MockLanguageModelV3 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import {
  createFakeMailServer,
  rawMail,
  type FakeMailServer,
} from "#src/assistant/mail/testing/create-fake-mail-server.ts";
import {
  insertAccount,
  insertUser,
  mailDeps,
} from "#src/assistant/mail/testing/insert-account.ts";
import { callAgentTool, type AgentTools } from "../agent-tool.ts";
import type { NewAgentAction } from "../run-agent.ts";
import { createMailTools, MAIL_TOOL_LIMITS } from "./create-mail-tools.ts";
import { MailHandles } from "./mail-handles.ts";
import { RunMailboxes } from "./run-mailboxes.ts";

let db: TestDb;
let userId: string;
let server: FakeMailServer;
let actions: NewAgentAction[];
let open: RunMailboxes[];

const noReader = {
  id: "no-reader",
  model: new MockLanguageModelV3({
    doGenerate: () => Promise.reject(new Error("No reader in this test")),
  }),
};

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  await insertAccount(db, userId);
  server = createFakeMailServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  server.addFolder("Finance");
  server.addFolder("Junk", { specialUse: "\\Junk" });
  server.addFolder("Deleted Messages", { specialUse: "\\Trash" });
  server.addFolder("Sent Messages", { specialUse: "\\Sent" });
  server.addFolder("Drafts", { specialUse: "\\Drafts" });
  server.addFolder("All Mail", { specialUse: "\\All" });
  actions = [];
  open = [];
});

afterEach(async () => {
  for (const mailboxes of open) await mailboxes.finish();
  await db.close();
});

function deliver(subject: string, flags: string[] = []) {
  const messageId = `<${subject.toLowerCase().replaceAll(" ", "-")}@example.com>`;
  server.deliver("INBOX", rawMail({ messageId, subject }), { flags });
  return messageId;
}

async function startRun(limits = MAIL_TOOL_LIMITS) {
  const mailboxes = await RunMailboxes.open(
    db,
    userId,
    mailDeps({ connector: server.connector }),
  );
  open.push(mailboxes);
  const { tools }: { tools: AgentTools } = createMailTools({
    limits,
    mailboxes,
    handles: new MailHandles(),
    reader: noReader,
    run: {
      logAction: (action) => {
        actions.push(action);
        return Promise.resolve();
      },
      addUsage: () => undefined,
    },
  });
  return (name: string, input: unknown) => callAgentTool(tools[name], input);
}

const listedSchema = z.object({
  mails: z.array(z.object({ id: z.string(), subject: z.string() })),
});

/** The error of a refused or failed call, or null when it worked. */
function errorOf(result: unknown) {
  const parsed = z.object({ error: z.string() }).safeParse(result);
  return parsed.success ? parsed.data.error : null;
}

/** The ids that list_mail gives the inbox mail, by subject. */
async function listInbox(call: Awaited<ReturnType<typeof startRun>>) {
  const listed = listedSchema.parse(
    await call("list_mail", { account: "a1", folder: "INBOX" }),
  );
  return Object.fromEntries(
    listed.mails.map((mail) => [mail.subject, mail.id]),
  );
}

describe("the mail tools", () => {
  it("move mail into Junk and the owner's folders, refuse Trash, Sent, Drafts and virtual folders, and never delete", async () => {
    const statement = deliver("Card statement");
    const prize = deliver("You won a prize");
    const call = await startRun();
    const ids = await listInbox(call);
    const before = server.countMail();

    for (const folder of [
      "Deleted Messages",
      "Sent Messages",
      "Drafts",
      "All Mail",
    ]) {
      expect(
        errorOf(
          await call("move_mail", {
            ids: [ids["Card statement"]],
            folder,
            reason: "Test",
          }),
        ),
      ).not.toBeNull();
    }
    expect(server.log.writes).toEqual([]);

    await call("move_mail", {
      ids: [ids["You won a prize"]],
      folder: "Junk",
      reason: "Prize scam",
    });
    await call("move_mail", {
      ids: [ids["Card statement"]],
      folder: "Finance",
      reason: "Card statement",
    });

    expect(server.locate(prize)).toMatchObject([{ path: "Junk" }]);
    expect(server.locate(statement)).toMatchObject([{ path: "Finance" }]);
    expect(server.countMail()).toBe(before);
    expect(server.log.writes.map((write) => write.command)).toEqual([
      "move",
      "move",
    ]);
    expect(actions).toMatchObject([
      {
        kind: "move",
        messageId: prize,
        subject: "You won a prize",
        fromFolder: "INBOX",
        toFolder: "Junk",
        reason: "Prize scam",
      },
      { kind: "move", messageId: statement, toFolder: "Finance" },
    ]);
  });

  it("act only on ids this run listed, and only on the user's own accounts", async () => {
    const otherUser = await insertUser(db);
    await insertAccount(db, otherUser);
    deliver("Card statement");
    const first = await startRun();
    const ids = await listInbox(first);
    const second = await startRun();

    expect(await second("list_accounts", {})).toEqual({
      accounts: [
        { account: "a1", address: "me@icloud.com", provider: "icloud" },
      ],
    });
    expect(
      errorOf(
        await second("move_mail", {
          ids: [ids["Card statement"]],
          folder: "Finance",
          reason: "Test",
        }),
      ),
    ).toContain("Unknown mail id");
    expect(
      errorOf(await second("list_mail", { account: "a2", folder: "INBOX" })),
    ).toContain("Unknown account");
    expect(server.log.writes).toEqual([]);
  });

  it("skip mail the owner moved since the run listed it, and find mail again after the server renumbered it", async () => {
    deliver("Card statement");
    const flight = deliver("Flight to Tokyo");
    const call = await startRun();
    const ids = await listInbox(call);
    server.moveAsUser("INBOX", 1, "Finance");
    server.renumber("INBOX");

    expect(
      await call("mark_read", {
        ids: [ids["Card statement"], ids["Flight to Tokyo"]],
        read: true,
        reason: "Routine",
      }),
    ).toMatchObject({
      changed: [ids["Flight to Tokyo"]],
      skipped: [{ id: ids["Card statement"] }],
    });
    expect(server.locate(flight)).toMatchObject([
      { path: "INBOX", flags: ["\\Seen"] },
    ]);
    expect(
      errorOf(
        await call("move_mail", {
          ids: [ids["Card statement"]],
          folder: "INBOX",
          reason: "Test",
        }),
      ),
    ).toContain(ids["Card statement"]);
  });

  it("mark mail that a call in the same step moved, in its new folder", async () => {
    const statement = deliver("Card statement");
    const call = await startRun();
    const ids = await listInbox(call);

    const [, marked] = await Promise.all([
      call("move_mail", {
        ids: [ids["Card statement"]],
        folder: "Finance",
        reason: "Card statement",
      }),
      call("mark_read", {
        ids: [ids["Card statement"]],
        read: true,
        reason: "Routine",
      }),
    ]);

    expect(marked).toMatchObject({ changed: [ids["Card statement"]] });
    expect(server.locate(statement)).toMatchObject([
      { path: "Finance", flags: ["\\Seen"] },
    ]);
  });

  it("change only mail whose state differs, and log one action for each", async () => {
    deliver("Read already", ["\\Seen"]);
    deliver("Unread");
    const call = await startRun();
    const ids = await listInbox(call);

    expect(
      await call("mark_read", {
        ids: [ids["Read already"], ids.Unread],
        read: true,
        reason: "Routine",
      }),
    ).toMatchObject({ changed: [ids.Unread] });
    await call("mark_flagged", {
      ids: [ids.Unread],
      flagged: true,
      reason: "Needs an answer",
    });
    await call("mark_read", { ids: [ids.Unread], read: false, reason: "Undo" });

    expect(actions.map((action) => [action.kind, action.subject])).toEqual([
      ["mark_read", "Unread"],
      ["flag", "Unread"],
      ["mark_unread", "Unread"],
    ]);
    expect(server.flagsOf("INBOX", 2)).toEqual(["\\Flagged"]);
  });

  it("keep to the per-run limits on folder changes and moved mail", async () => {
    for (const subject of ["One", "Two", "Three"]) deliver(subject);
    const call = await startRun({
      ...MAIL_TOOL_LIMITS,
      folderChangesPerAccount: 1,
      moves: 2,
    });
    const ids = await listInbox(call);

    expect(
      await call("create_folder", {
        account: "a1",
        name: "Travel",
        reason: "Bookings",
      }),
    ).toEqual({ folder: "Travel", created: true, canMoveHere: true });
    expect(
      await call("create_folder", {
        account: "a1",
        name: " travel ",
        reason: "Bookings",
      }),
    ).toMatchObject({ folder: "Travel", created: false });
    expect(
      errorOf(
        await call("create_folder", {
          account: "a1",
          name: "Receipts",
          reason: "Shops",
        }),
      ),
    ).not.toBeNull();
    expect(
      errorOf(
        await call("move_mail", {
          ids: [ids.One, ids.Two, ids.Three],
          folder: "Travel",
          reason: "Test",
        }),
      ),
    ).not.toBeNull();
    expect(
      await call("move_mail", {
        ids: [ids.One, ids.Two],
        folder: "Travel",
        reason: "Test",
      }),
    ).toMatchObject({ moved: [ids.One, ids.Two] });

    expect(server.log.createdFolders).toEqual(["Travel"]);
    expect(
      errorOf(
        await call("move_mail", {
          ids: [ids.Three],
          folder: "Travel",
          reason: "Test",
        }),
      ),
    ).not.toBeNull();
  });

  it("keep calls that the model makes at the same time within the run's limits", async () => {
    const delivered = ["One", "Two", "Three"].map((subject) =>
      deliver(subject),
    );
    const call = await startRun({ ...MAIL_TOOL_LIMITS, moves: 2 });
    const ids = await listInbox(call);

    const results = await Promise.all(
      [[ids.One, ids.Two], [ids.Three]].map((batch) =>
        call("move_mail", { ids: batch, folder: "Finance", reason: "Test" }),
      ),
    );

    expect(results.filter((result) => errorOf(result) !== null)).toHaveLength(
      1,
    );
    expect(
      delivered.filter((messageId) =>
        server.locate(messageId).some(({ path }) => path === "Finance"),
      ),
    ).toHaveLength(2);
  });

  it("merge folders: move mail between the owner's folders, then delete only a folder that is empty and ordinary", async () => {
    server.addFolder("Purchases");
    server.addFolder("Receipts");
    server.addFolder("Projects");
    server.addFolder("Projects/Old");
    const order = `<order@example.com>`;
    server.deliver(
      "Purchases",
      rawMail({ messageId: order, subject: "Order" }),
    );
    deliver("Unfiled");
    const call = await startRun();
    const before = server.countMail();

    for (const folder of [
      "INBOX",
      "Junk",
      "Deleted Messages",
      "Purchases",
      "Projects",
    ]) {
      expect(
        errorOf(
          await call("delete_folder", {
            account: "a1",
            folder,
            reason: "Test",
          }),
        ),
      ).not.toBeNull();
    }
    expect(server.log.deletedFolders).toEqual([]);

    const listed = listedSchema.parse(
      await call("list_mail", { account: "a1", folder: "Purchases" }),
    );
    expect(
      await call("move_mail", {
        ids: listed.mails.map((mail) => mail.id),
        folder: "Receipts",
        reason: "Purchases and Receipts hold the same kind of mail",
      }),
    ).toMatchObject({ moved: [listed.mails[0].id] });
    expect(
      await call("delete_folder", {
        account: "a1",
        folder: "Purchases",
        reason: "Merged into Receipts",
      }),
    ).toEqual({ deleted: "Purchases" });

    expect(server.locate(order)).toMatchObject([{ path: "Receipts" }]);
    expect(server.countMail()).toBe(before);
    expect(server.log.deletedFolders).toEqual(["Purchases"]);
    expect(actions.map((action) => [action.kind, action.fromFolder])).toEqual([
      ["move", "Purchases"],
      ["delete_folder", "Purchases"],
    ]);
  });

  it("rename a folder with the folders inside it, keep its mail ids working, and never rename INBOX or a special folder", async () => {
    server.addFolder("Shop");
    server.addFolder("Shop/Old");
    const order = `<order@example.com>`;
    server.deliver("Shop/Old", rawMail({ messageId: order, subject: "Order" }));
    const call = await startRun();
    const listed = listedSchema.parse(
      await call("list_mail", { account: "a1", folder: "Shop/Old" }),
    );

    for (const folder of ["INBOX", "Junk"]) {
      expect(
        errorOf(
          await call("rename_folder", {
            account: "a1",
            folder,
            name: "Other",
            reason: "Test",
          }),
        ),
      ).not.toBeNull();
    }
    expect(
      errorOf(
        await call("rename_folder", {
          account: "a1",
          folder: "Shop",
          name: "finance",
          reason: "Test",
        }),
      ),
    ).toContain("exists already");
    expect(
      await call("rename_folder", {
        account: "a1",
        folder: "Shop",
        name: "Shopping",
        reason: "A clearer name",
      }),
    ).toEqual({ folder: "Shopping", renamed: true });
    expect(
      await call("mark_flagged", {
        ids: [listed.mails[0].id],
        flagged: true,
        reason: "Test",
      }),
    ).toMatchObject({ changed: [listed.mails[0].id] });

    expect(server.locate(order)).toMatchObject([
      { path: "Shopping/Old", flags: ["\\Flagged"] },
    ]);
    expect(actions.map((action) => [action.kind, action.toFolder])).toEqual([
      ["rename_folder", "Shopping"],
      ["flag", null],
    ]);
  });

  it("log in again when the server closed the connection while the model thought", async () => {
    const unread = deliver("Unread");
    const call = await startRun();
    const ids = await listInbox(call);
    server.dropConnections();

    expect(
      await call("mark_read", {
        ids: [ids.Unread],
        read: true,
        reason: "Routine",
      }),
    ).toMatchObject({ changed: [ids.Unread] });
    expect(server.log.logins).toBe(2);
    expect(server.locate(unread)).toMatchObject([{ flags: ["\\Seen"] }]);
  });

  it("refuse a write without a reason", async () => {
    deliver("Unread");
    const call = await startRun();
    const ids = await listInbox(call);

    expect(
      errorOf(
        await call("mark_read", { ids: [ids.Unread], read: true, reason: " " }),
      ),
    ).toContain("Invalid input");
    expect(server.log.writes).toEqual([]);
  });
});
