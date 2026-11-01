import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mailCategories,
  mailClassifications,
  mailFolders,
  mailHistoryJobs,
  mailMessages,
  mailSentRecipients,
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
} from "#src/assistant/mail/testing/insert-account.ts";
import { syncUserMail } from "../mail/sync/sync-user-mail.ts";
import { walkHistory } from "./walk-history.ts";

let db: TestDb;
let userId: string;
let accountId: string;
let server: FakeMailServer;

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  accountId = await insertAccount(db, userId);
  server = createFakeMailServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  server.addFolder("Bills");
  server.addFolder("Sent Messages", { specialUse: "\\Sent" });
  server.addFolder("Junk", { specialUse: "\\Junk" });
});

afterEach(async () => {
  await db.close();
});

function deliver(path: string, count: number, prefix: string) {
  for (let index = 1; index <= count; index += 1) {
    server.deliver(
      path,
      rawMail({
        messageId: `<${prefix}-${String(index)}@example.com>`,
        subject: `${prefix} ${String(index)}`,
        body: "Please send the signed form back by Friday.",
      }),
      { flags: index === 1 ? ["\\Answered"] : [] },
    );
  }
}

function sync() {
  return syncUserMail(
    { db, userId, endsAt: Infinity, now: () => new Date() },
    mailDeps({ connector: server.connector }),
  );
}

function walk(connector: MailboxConnector = server.connector) {
  return walkHistory({ db, userId, endsAt: Infinity }, mailDeps({ connector }));
}

/** Maps the Bills folder to a category, as the setup page does. */
async function mapBills() {
  await withUser(db, userId, async ({ db, userId }) => {
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
  });
}

/** A connector whose sessions fail on the `failAt`-th fetch, as a crash would stop a run. */
function crashingConnector(failAt: number): MailboxConnector {
  let fetches = 0;
  return async (mailServer, auth) => {
    const session = await server.connector(mailServer, auth);
    return {
      ...session,
      fetchMessages: (uids, maxBytes) => {
        fetches += 1;
        if (fetches === failAt) {
          return Promise.reject(new Error("The connection dropped"));
        }
        return session.fetchMessages(uids, maxBytes);
      },
    };
  };
}

function storedMail() {
  return withUser(db, userId, ({ db }) =>
    db
      .select({
        messageId: mailMessages.messageId,
        origin: mailMessages.origin,
        snippet: mailMessages.snippet,
        folder: mailFolders.path,
        decidedBy: mailClassifications.decidedBy,
        categoryId: mailClassifications.categoryId,
        queued: mailHistoryJobs.messageId,
      })
      .from(mailMessages)
      .leftJoin(mailFolders, eq(mailFolders.id, mailMessages.folderId))
      .leftJoin(
        mailClassifications,
        eq(mailClassifications.messageId, mailMessages.id),
      )
      .leftJoin(
        mailHistoryJobs,
        eq(mailHistoryJobs.messageId, mailMessages.id),
      ),
  );
}

function folderStates() {
  return withUser(db, userId, ({ db }) =>
    db
      .select({
        path: mailFolders.path,
        next: mailFolders.historyNextUid,
        doneAt: mailFolders.historyDoneAt,
      })
      .from(mailFolders),
  );
}

describe("walkHistory", () => {
  it("stores the mail from before the connection once: filed mail indexed by its folder, the rest queued for the model", async () => {
    deliver("INBOX", 30, "old");
    deliver("Bills", 3, "bill");
    deliver("Junk", 2, "junk");
    server.deliver(
      "Sent Messages",
      rawMail({
        messageId: "<sent-1@icloud.com>",
        from: "me@icloud.com",
        to: "Friend <Friend@Example.com>",
      }),
    );
    await sync();
    await mapBills();
    deliver("INBOX", 2, "live");
    await sync();

    const result = await walk();

    expect(result).toEqual({ stored: 33, queued: 30, complete: true });
    const mail = await storedMail();
    const inbox = mail.filter((row) => row.folder === "INBOX");
    expect(inbox.filter((row) => row.origin === "live")).toHaveLength(2);
    const old = inbox.filter((row) => row.origin === "history");
    expect(old).toHaveLength(30);
    expect(old.every((row) => row.queued !== null && row.snippet !== "")).toBe(
      true,
    );
    const bills = mail.filter((row) => row.folder === "Bills");
    expect(bills).toHaveLength(3);
    expect(
      bills.every(
        (row) =>
          row.decidedBy === "folder" &&
          row.categoryId !== null &&
          row.snippet === "" &&
          row.queued === null,
      ),
    ).toBe(true);
    expect(mail.some((row) => row.messageId.startsWith("<junk-"))).toBe(false);
    expect(
      await withUser(db, userId, ({ db }) =>
        db
          .select({ address: mailSentRecipients.address })
          .from(mailSentRecipients),
      ),
    ).toEqual([{ address: "friend@example.com" }]);
    const states = await folderStates();
    for (const path of ["INBOX", "Bills", "Sent Messages"]) {
      const state = states.find((entry) => entry.path === path);
      expect(state?.next).toBe(0);
      expect(state?.doneAt).toBeInstanceOf(Date);
    }
    expect(states.find((state) => state.path === "Junk")?.next).toBeNull();

    expect(await walk()).toEqual({ stored: 0, queued: 0, complete: true });
    expect(await storedMail()).toHaveLength(mail.length);
  });

  it("goes on below its checkpoint after a run stopped part of the way, and fetches nothing twice", async () => {
    deliver("INBOX", 60, "old");
    await sync();

    const stopped = await walk(crashingConnector(2));

    expect(stopped).toEqual({ stored: 25, queued: 25, complete: false });
    const inbox = (await folderStates()).find(
      (state) => state.path === "INBOX",
    );
    expect(inbox).toMatchObject({ next: 35, doneAt: null });
    server.log.fetchedUids.length = 0;

    expect(await walk()).toEqual({ stored: 35, queued: 35, complete: true });
    expect([...server.log.fetchedUids].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 35 }, (_, index) => index + 1),
    );
    expect(await storedMail()).toHaveLength(60);
  });

  it("starts the walk again when UIDVALIDITY changed, without storing a mail twice", async () => {
    deliver("Bills", 30, "bill");
    await sync();
    await mapBills();
    await walk(crashingConnector(2));

    server.renumber("Bills");
    const result = await walk();

    expect(result).toEqual({ stored: 5, queued: 0, complete: true });
    expect(await storedMail()).toHaveLength(30);
  });

  it("waits with the inbox until sync has put its cursor there", async () => {
    deliver("INBOX", 3, "old");

    expect(await walk()).toMatchObject({ stored: 0 });
    await sync();
    expect(await walk()).toEqual({ stored: 3, queued: 3, complete: true });
  });

  // Regression: one mail that the database refused stopped the walk of its folder for good.
  it("skips an old mail the database refuses and walks on", async () => {
    deliver("INBOX", 3, "old");
    await sync();
    const refusing: MailboxConnector = async (mailServer, auth) => {
      const session = await server.connector(mailServer, auth);
      return {
        ...session,
        fetchMessages: async (uids, maxBytes) =>
          (await session.fetchMessages(uids, maxBytes)).map((message) =>
            message.uid === 2
              ? {
                  ...message,
                  envelope: { ...message.envelope, date: new Date(Number.NaN) },
                }
              : message,
          ),
      };
    };

    expect(await walk(refusing)).toEqual({
      stored: 2,
      queued: 2,
      complete: true,
    });
  });

  // Regression: new inbox mail with a Gmail label stayed `history` when the walk read the label first, so it was never classified.
  it("gives new inbox mail to the classifier when the walk stored it first from a label", async () => {
    server.addFolder("Work");
    await sync();
    const mail = rawMail({
      messageId: "<labelled@example.com>",
      body: "Please send the signed form back by Friday.",
    });
    server.deliver("INBOX", mail);
    server.deliver("Work", mail);

    expect(await walk()).toMatchObject({ stored: 1, queued: 1 });
    expect(await sync()).toMatchObject({ newMessages: 1 });

    const stored = await withUser(db, userId, async ({ db }) => ({
      mail: await db
        .select({ origin: mailMessages.origin, path: mailFolders.path })
        .from(mailMessages)
        .innerJoin(mailFolders, eq(mailFolders.id, mailMessages.folderId)),
      jobs: await db.select().from(mailHistoryJobs),
      classifications: await db.select().from(mailClassifications),
    }));
    expect(stored).toEqual({
      mail: [{ origin: "live", path: "INBOX" }],
      jobs: [],
      classifications: [],
    });
  });
});
