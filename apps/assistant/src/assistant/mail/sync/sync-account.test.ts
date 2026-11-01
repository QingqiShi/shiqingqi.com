import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mailFolders, mailMessages } from "#src/assistant/db/schema.ts";
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
import { syncUserMail } from "./sync-user-mail.ts";

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
  server.addFolder("[Gmail]", { selectable: false });
  server.addFolder("Trash", { specialUse: "\\Trash" });
});

afterEach(async () => {
  await db.close();
});

function sync(
  connector: MailboxConnector = server.connector,
  endsAt = Infinity,
) {
  return syncUserMail(
    { db, userId, endsAt, now: () => new Date() },
    mailDeps({ connector }),
  );
}

/** Text that Postgres cannot compress to fit an index entry. */
function incompressible(length: number) {
  let text = "";
  while (text.length < length) {
    text += createHash("sha256").update(text).digest("hex");
  }
  return text.slice(0, length);
}

function storedMail() {
  return withUser(db, userId, ({ db }) =>
    db.select().from(mailMessages).orderBy(mailMessages.uid),
  );
}

function inboxFolder() {
  return withUser(db, userId, async ({ db }) => {
    const [folder] = await db
      .select()
      .from(mailFolders)
      .where(
        and(
          eq(mailFolders.accountId, accountId),
          eq(mailFolders.path, "INBOX"),
        ),
      );
    return folder;
  });
}

function deliverMany(count: number) {
  for (let index = 1; index <= count; index++) {
    server.deliver(
      "INBOX",
      rawMail({ messageId: `<m${String(index)}@example.com>` }),
    );
  }
}

describe("mail sync", () => {
  it("stores the folders with counts on the first sync, and treats the mail already there as history", async () => {
    server.deliver("INBOX", rawMail({ messageId: "<old@example.com>" }));
    server.deliver("Bills", rawMail({ messageId: "<bill@example.com>" }), {
      flags: ["\\Seen"],
    });

    expect(await sync()).toEqual({ accounts: 1, failed: 0, newMessages: 0 });

    const folders = await withUser(db, userId, ({ db }) =>
      db
        .select({
          path: mailFolders.path,
          messages: mailFolders.messageCount,
          unseen: mailFolders.unseenCount,
        })
        .from(mailFolders)
        .orderBy(mailFolders.path),
    );
    expect(folders).toEqual([
      { path: "Bills", messages: 1, unseen: 0 },
      { path: "INBOX", messages: 1, unseen: 1 },
      { path: "Trash", messages: 0, unseen: 0 },
    ]);
    expect(await storedMail()).toEqual([]);
    expect(server.log.fetchedUids).toEqual([]);
    expect(await inboxFolder()).toMatchObject({
      cursorLastUid: 1,
      cursorBaselineUid: 1,
    });
  });

  it("stores each new inbox mail once, and a second run fetches nothing", async () => {
    await sync();
    server.deliver(
      "INBOX",
      rawMail({
        messageId: "<new@example.com>",
        from: "Ann <Ann@Example.com>",
        subject: "Lunch?",
        body: "Lunch on Friday?\r\n\r\nOn Thu, Ann wrote:\r\n> earlier",
        headers: { "List-Id": "<news.example.com>" },
      }),
    );
    // The same mail again, as a copy in the same mailbox.
    server.deliver("INBOX", rawMail({ messageId: "<new@example.com>" }));

    const first = await sync();
    const fetchedBySecond = server.log.fetchedUids.length;
    const second = await sync();

    expect(first.newMessages).toBe(1);
    expect(second.newMessages).toBe(0);
    expect(server.log.fetchedUids).toHaveLength(fetchedBySecond);
    expect(await storedMail()).toMatchObject([
      {
        messageId: "<new@example.com>",
        fromAddress: "ann@example.com",
        fromName: "Ann",
        subject: "Lunch?",
        snippet: "Lunch on Friday?",
        listId: "<news.example.com>",
        origin: "live",
        flags: [],
      },
    ]);
    expect(server.flagsOf("INBOX", 1)).toEqual([]);
  });

  // Regression: one mail that the database refused stopped the cursor of its account for good.
  it("stores mail with a NUL byte or a very long Message-ID, and keeps the place of a mail the database refuses", async () => {
    await sync();
    server.deliver(
      "INBOX",
      rawMail({
        messageId: "<nul@example.com>",
        subject: "Pay\u0000slip",
        body: "Your\u0000payslip",
      }),
    );
    server.deliver(
      "INBOX",
      rawMail({ messageId: `<${incompressible(3200)}@example.com>` }),
    );
    server.deliver("INBOX", rawMail({ messageId: "<bad-date@example.com>" }));
    const connector: MailboxConnector = async (mailServer, auth) => {
      const session = await server.connector(mailServer, auth);
      return {
        ...session,
        fetchMessages: async (uids, maxBytes) =>
          (await session.fetchMessages(uids, maxBytes)).map((message) =>
            message.uid === 3
              ? {
                  ...message,
                  envelope: { ...message.envelope, date: new Date(Number.NaN) },
                }
              : message,
          ),
      };
    };

    const result = await sync(connector);

    expect(result.newMessages).toBe(3);
    const stored = await storedMail();
    expect(stored.map((mail) => [mail.uid, mail.subject])).toEqual([
      [1, "Payslip"],
      [2, "Hello"],
      [3, ""],
    ]);
    expect(stored[0].snippet).toBe("Yourpayslip");
    expect(stored[1].messageId).toMatch(
      /^<[0-9a-f]{64}@no-message-id\.invalid>$/,
    );
    expect((await inboxFolder()).cursorLastUid).toBe(3);
  });

  it("goes on where a run stopped, whether the time ran out or the connection failed", async () => {
    await sync();
    deliverMany(60);
    let fetches = 0;
    let crash = false;
    const flaky: MailboxConnector = async (mailServer, auth) => {
      const session = await server.connector(mailServer, auth);
      return {
        ...session,
        fetchMessages: (uids, maxBytes) => {
          fetches += 1;
          if (crash && fetches === 2) throw new Error("Connection reset");
          return session.fetchMessages(uids, maxBytes);
        },
      };
    };

    const timedOut = await syncUserMail(
      {
        db,
        userId,
        endsAt: Date.now() + 60_000,
        now: () => (fetches >= 1 ? new Date(Date.now() + 120_000) : new Date()),
      },
      mailDeps({
        connector: flaky,
        now: () => (fetches >= 1 ? new Date(Date.now() + 120_000) : new Date()),
      }),
    );
    expect(timedOut.newMessages).toBe(25);

    fetches = 0;
    crash = true;
    expect(await sync(flaky)).toMatchObject({ failed: 1, newMessages: 0 });
    expect(await storedAccount(db, userId, accountId)).toMatchObject({
      status: "error",
      lastErrorCode: "sync_failed",
      lastErrorMessage: "Connection reset",
    });

    crash = false;
    expect(await sync(flaky)).toMatchObject({ failed: 0, newMessages: 10 });
    expect(await storedMail()).toHaveLength(60);
    expect(await storedAccount(db, userId, accountId)).toMatchObject({
      status: "ok",
      lastErrorCode: null,
    });
    expect(await inboxFolder()).toMatchObject({ cursorLastUid: 60 });
  });

  it("after a UIDVALIDITY change, stores only the mail it has not seen and moves the cursor to the new UIDs", async () => {
    await sync();
    deliverMany(2);
    await sync();
    server.renumber("INBOX");
    server.deliver(
      "INBOX",
      rawMail({ messageId: "<after-reset@example.com>" }),
    );

    expect((await sync()).newMessages).toBe(1);
    expect((await storedMail()).map((mail) => mail.messageId)).toEqual([
      "<m1@example.com>",
      "<m2@example.com>",
      "<after-reset@example.com>",
    ]);
    expect(await inboxFolder()).toMatchObject({
      cursorUidValidity: 2,
      cursorLastUid: 3,
    });
  });

  it("asks for a new connect when the server refuses the login, and the cron then skips the account", async () => {
    const strict = createFakeMailServer({
      user: "me@icloud.com",
      password: "revoked",
    });

    expect(await sync(strict.connector)).toMatchObject({
      accounts: 1,
      failed: 1,
    });
    expect(await storedAccount(db, userId, accountId)).toMatchObject({
      status: "reconnect",
      lastErrorCode: "login_refused",
    });
    expect(await sync(strict.connector)).toMatchObject({ accounts: 0 });
  });
});

describe("an OAuth account", () => {
  it("refreshes an expired access token and stores the refresh token that Microsoft rotated", async () => {
    const outlookId = await insertAccount(db, userId, {
      provider: "outlook",
      address: "me@outlook.com",
      credential: {
        type: "oauth",
        refreshToken: "refresh-1",
        accessToken: "access-1",
        accessTokenExpiresAt: Date.now() - 1000,
      },
    });
    const outlook = createFakeMailServer({
      user: "me@outlook.com",
      accessToken: "access-2",
    });
    const requests: URLSearchParams[] = [];
    const fetch = (_url: string | URL | Request, init?: RequestInit) => {
      requests.push(
        new URLSearchParams(
          init?.body instanceof URLSearchParams ? init.body : undefined,
        ),
      );
      return Promise.resolve(
        Response.json({
          access_token: "access-2",
          refresh_token: "refresh-2",
          expires_in: 3600,
        }),
      );
    };

    const result = await syncUserMail(
      {
        db,
        userId,
        endsAt: Infinity,
        now: () => new Date(),
        accountIds: [outlookId],
      },
      mailDeps({ connector: outlook.connector, fetch }),
    );

    expect(result).toMatchObject({ accounts: 1, failed: 0 });
    expect(requests.map((body) => body.get("refresh_token"))).toEqual([
      "refresh-1",
    ]);
    expect((await storedAccount(db, userId, outlookId)).opened).toMatchObject({
      refreshToken: "refresh-2",
      accessToken: "access-2",
    });
  });
});
