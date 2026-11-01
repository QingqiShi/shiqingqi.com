import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mailCategories,
  mailClassifications,
  mailDigests,
  mailFolders,
  mailMessages,
  mailWriteStates,
  userSettings,
  type MailBucket,
} from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import type { MailboxConnector } from "#src/assistant/mail/imap/types.ts";
import {
  createFakeMailServer,
  rawMail,
  type FakeMailServer,
} from "#src/assistant/mail/testing/create-fake-mail-server.ts";
import {
  insertAccount,
  insertUser,
  mailDeps,
  storedAccount,
} from "#src/assistant/mail/testing/insert-account.ts";
import { syncUserMail } from "../sync/sync-user-mail.ts";
import { writeMailboxes } from "./write-mailboxes.ts";

let db: TestDb;
let userId: string;
let accountId: string;
let server: FakeMailServer;

const HOUR = 60 * 60 * 1000;

function connectServer(options: { uidPlus?: boolean } = {}) {
  server = createFakeMailServer({
    user: "me@icloud.com",
    password: "app-password",
    ...options,
  });
  server.addFolder("Bills");
  server.addFolder("Receipts");
}

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  accountId = await insertAccount(db, userId);
  connectServer();
});

afterEach(async () => {
  await db.close();
});

function sync(connector: MailboxConnector = server.connector) {
  return syncUserMail(
    { db, userId, endsAt: Infinity, now: () => new Date() },
    mailDeps({ connector }),
  );
}

function write(
  options: { messageIds?: string[]; connector?: MailboxConnector } = {},
) {
  return writeMailboxes(
    { db, userId, endsAt: Infinity, messageIds: options.messageIds },
    mailDeps({ connector: options.connector ?? server.connector }),
  );
}

function allowWrites(since = new Date(Date.now() - HOUR)) {
  return withUser(db, userId, ({ db, userId }) =>
    db
      .insert(userSettings)
      .values({ userId, mailboxWrites: true, mailboxWritesSince: since }),
  );
}

/** Makes "Bills" the folder of the category Bills; "Receipts" stays unmapped. */
function mapBills() {
  return withUser(db, userId, async ({ db, userId }) => {
    const [category] = await db
      .insert(mailCategories)
      .values({ userId, name: "Bills" })
      .returning();
    await db
      .update(mailFolders)
      .set({ categoryId: category.id })
      .where(
        and(
          eq(mailFolders.accountId, accountId),
          eq(mailFolders.path, "Bills"),
        ),
      );
    return category.id;
  });
}

/** Delivers mail to the inbox, syncs it and classifies each with its bucket. */
async function receive(
  mails: { id: string; bucket: MailBucket; categoryId?: string | null }[],
  classifiedAt = new Date(),
) {
  for (const mail of mails) {
    server.deliver("INBOX", rawMail({ messageId: mail.id }));
  }
  await sync();
  return withUser(db, userId, async ({ db, userId }) => {
    const ids = new Map<string, string>();
    for (const mail of mails) {
      const [message] = await db
        .select({ id: mailMessages.id })
        .from(mailMessages)
        .where(eq(mailMessages.messageId, mail.id));
      await db.insert(mailClassifications).values({
        userId,
        messageId: message.id,
        bucket: mail.bucket,
        categoryId: mail.categoryId ?? null,
        decidedBy: "rule",
        reason: "test",
        classifiedAt,
      });
      ids.set(mail.id, message.id);
    }
    return ids;
  });
}

function storedLocation(messageId: string) {
  return withUser(db, userId, async ({ db }) => {
    const [row] = await db
      .select({
        path: mailFolders.path,
        uid: mailMessages.uid,
        uidValidity: mailMessages.uidValidity,
      })
      .from(mailMessages)
      .innerJoin(mailFolders, eq(mailFolders.id, mailMessages.folderId))
      .where(eq(mailMessages.messageId, messageId));
    return row;
  });
}

function where(messageId: string) {
  return server.locate(messageId);
}

beforeEach(async () => {
  await sync();
});

describe("mailbox writes", () => {
  it("marks, flags and files each mail by its bucket, and a second run sends no command", async () => {
    const bills = await mapBills();
    await allowWrites();
    const ids = await receive([
      { id: "<act@x>", bucket: "act", categoryId: bills },
      { id: "<unsure@x>", bucket: "unsure" },
      { id: "<fyi@x>", bucket: "fyi", categoryId: bills },
      { id: "<filed@x>", bucket: "filed", categoryId: bills },
      { id: "<unmapped@x>", bucket: "filed" },
    ]);

    await write();

    expect(where("<act@x>")).toEqual([
      { path: "INBOX", uid: 1, flags: ["\\Flagged", "\\Seen"] },
    ]);
    expect(where("<unsure@x>")).toEqual([
      { path: "INBOX", uid: 2, flags: ["\\Flagged", "\\Seen"] },
    ]);
    expect(where("<fyi@x>")).toEqual([
      { path: "INBOX", uid: 3, flags: ["\\Seen"] },
    ]);
    expect(where("<filed@x>")).toEqual([
      { path: "Bills", uid: 1, flags: ["\\Seen"] },
    ]);
    expect(where("<unmapped@x>")).toEqual([
      { path: "INBOX", uid: 5, flags: ["\\Seen"] },
    ]);
    expect(await storedLocation("<filed@x>")).toEqual({
      path: "Bills",
      uid: 1,
      uidValidity: 1,
    });
    expect(server.log.writes.map((entry) => entry.command)).toEqual([
      "add",
      "add",
      "move",
    ]);

    const commands = server.log.writes.length;
    await write();
    expect(server.log.writes).toHaveLength(commands);

    await withUser(db, userId, ({ db, userId }) =>
      db.insert(mailDigests).values({
        userId,
        localDate: "2026-11-01",
        windowStart: new Date(Date.now() - HOUR),
        builtAt: new Date(),
        arrangedBy: "fallback",
        content: {
          version: 1,
          sections: { act: [], unsure: [], fyi: [] },
          calendar: [],
          filed: [],
          sample: [],
        },
      }),
    );
    await write();
    expect(where("<fyi@x>")).toEqual([
      { path: "Bills", uid: 2, flags: ["\\Seen"] },
    ]);
    expect(where("<act@x>")[0].path).toBe("INBOX");

    const actId = ids.get("<act@x>") ?? "";
    const unsureId = ids.get("<unsure@x>") ?? "";
    await withUser(db, userId, ({ db }) =>
      db.update(mailClassifications).set({ doneAt: new Date() }),
    );
    await write({ messageIds: [actId, unsureId] });
    expect(where("<act@x>")).toEqual([
      { path: "Bills", uid: 3, flags: ["\\Seen"] },
    ]);
    expect(where("<unsure@x>")).toEqual([
      { path: "INBOX", uid: 2, flags: ["\\Seen"] },
    ]);
  });

  it("changes nothing while writes are off, and leaves mail classified before they were turned on", async () => {
    const bills = await mapBills();
    await receive(
      [{ id: "<old@x>", bucket: "filed", categoryId: bills }],
      new Date(Date.now() - 2 * HOUR),
    );
    await write();
    await allowWrites(new Date(Date.now() - HOUR));
    await write();

    expect(where("<old@x>")).toEqual([{ path: "INBOX", uid: 1, flags: [] }]);
    expect(server.log.writes).toEqual([]);
  });

  // Regression: open act mail filled the page of candidates, so the mail after it was never written.
  it("writes new mail behind more than a page of mail that waits for the user, and still finds waiting mail the user moved away", async () => {
    const bills = await mapBills();
    await allowWrites();
    await receive(
      Array.from({ length: 501 }, (_, index) => ({
        id: `<act${String(index)}@x>`,
        bucket: "act" as const,
      })),
    );
    await write();
    await write();
    expect(where("<act500@x>")).toEqual([
      { path: "INBOX", uid: 501, flags: ["\\Flagged", "\\Seen"] },
    ]);
    server.moveAsUser("INBOX", 1, "Receipts");
    await receive([{ id: "<filed@x>", bucket: "filed", categoryId: bills }]);

    const runs = [];
    for (let run = 0; run < 6; run++) runs.push(await write());

    expect(where("<filed@x>")).toEqual([
      { path: "Bills", uid: 1, flags: ["\\Seen"] },
    ]);
    expect(runs.reduce((sum, run) => sum + run.lost, 0)).toBe(1);
  }, 60_000);

  it("stops at mail the user moved, and never writes to the folder it went to", async () => {
    await allowWrites();
    await receive([{ id: "<act@x>", bucket: "act" }]);
    server.moveAsUser("INBOX", 1, "Receipts");

    expect(await write()).toMatchObject({ written: 0, lost: 1 });
    await write();

    expect(where("<act@x>")).toEqual([{ path: "Receipts", uid: 1, flags: [] }]);
    expect(server.log.writes).toEqual([]);
  });

  it("finds moved mail by its Message-ID when a run stopped after the move, or the server gave no new UID", async () => {
    const bills = await mapBills();
    await allowWrites();
    connectServer({ uidPlus: false });
    await sync();
    await receive([
      { id: "<a@x>", bucket: "filed", categoryId: bills },
      { id: "<b@x>", bucket: "filed", categoryId: bills },
    ]);
    const crashAfterMove: MailboxConnector = async (mailServer, auth) => {
      const session = await server.connector(mailServer, auth);
      return {
        ...session,
        moveMessages: async (uids, destination) => {
          await session.moveMessages(uids, destination);
          throw new Error("Connection reset");
        },
      };
    };

    expect(await write({ connector: crashAfterMove })).toMatchObject({
      failed: 2,
    });
    expect(await storedLocation("<a@x>")).toMatchObject({ path: "INBOX" });

    await write();

    expect(where("<a@x>")).toEqual([
      { path: "Bills", uid: 1, flags: ["\\Seen"] },
    ]);
    expect(await storedLocation("<a@x>")).toEqual({
      path: "Bills",
      uid: 1,
      uidValidity: 1,
    });
    expect(await storedLocation("<b@x>")).toMatchObject({
      path: "Bills",
      uid: 2,
    });
    expect(
      server.log.writes.filter((entry) => entry.command === "move"),
    ).toHaveLength(1);

    await receive([{ id: "<c@x>", bucket: "filed", categoryId: bills }]);
    await write();
    expect(await storedLocation("<c@x>")).toEqual({
      path: "Bills",
      uid: 3,
      uidValidity: 1,
    });
  });

  it("shows a failed command on the account until a later run works", async () => {
    const bills = await mapBills();
    await allowWrites();
    await receive([{ id: "<a@x>", bucket: "filed", categoryId: bills }]);
    server.failCommand("move");

    expect(await write()).toMatchObject({ failed: 1 });
    expect(await storedAccount(db, userId, accountId)).toMatchObject({
      writeErrorCode: "write_failed",
      writeErrorMessage: "The server refused move",
    });
    const [state] = await withUser(db, userId, ({ db }) =>
      db.select().from(mailWriteStates),
    );
    expect(state).toMatchObject({ failures: 1, finishedAt: null });

    server.failCommand(null);
    await write();

    expect(where("<a@x>")[0].path).toBe("Bills");
    expect(await storedAccount(db, userId, accountId)).toMatchObject({
      writeErrorCode: null,
      writeErrorAt: null,
    });
  });
});
