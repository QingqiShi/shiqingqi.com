import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mailAccounts } from "#src/assistant/db/schema.ts";
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
import { readMailView } from "./read-mail-view.ts";

const MESSAGE_ID = "<receipt-42@shop.example>";

let db: TestDb;
let userId: string;
let accountId: string;
let mail: FakeMailServer;

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  accountId = await insertAccount(db, userId);
  mail = createFakeMailServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  mail.addFolder("Receipts");
  mail.deliver(
    "INBOX",
    rawMail({ messageId: "<other@shop.example>", subject: "Other" }),
  );
  mail.deliver(
    "Receipts",
    rawMail({
      messageId: MESSAGE_ID,
      subject: "Your receipt",
      body: "Thanks for your order.",
    }),
  );
});

afterEach(async () => {
  await db.close();
});

describe("readMailView", () => {
  it("finds a mail outside the inbox and leaves it unread", async () => {
    const result = await readMailView(
      { db, userId },
      mailDeps({ connector: mail.connector }),
      accountId,
      MESSAGE_ID,
      Promise.resolve(null),
    );

    expect(result?.kind).toBe("found");
    if (result?.kind !== "found") return;
    expect(result.mail.folder).toBe("Receipts");
    expect(result.mail.subject).toBe("Your receipt");
    expect(result.mail.body.kind).toBe("text");
    if (result.mail.body.kind !== "text") return;
    expect(result.mail.body.text).toContain("Thanks for your order.");
    expect(mail.locate(MESSAGE_ID)).toEqual([
      { path: "Receipts", uid: 1, flags: [] },
    ]);
    expect(mail.log.opened.every((opened) => !opened.write)).toBe(true);
    expect(mail.log.writes).toEqual([]);
  });

  it("does not open another user's account", async () => {
    const stranger = await insertUser(db);

    const result = await readMailView(
      { db, userId: stranger },
      mailDeps({ connector: mail.connector }),
      accountId,
      MESSAGE_ID,
      Promise.resolve(null),
    );

    expect(result).toBeNull();
    expect(mail.log.logins).toBe(0);
  });

  it("marks the account for a new connect when the server refuses the login", async () => {
    const refusing = createFakeMailServer({
      user: "me@icloud.com",
      password: "a-new-password",
    });

    const result = await readMailView(
      { db, userId },
      mailDeps({ connector: refusing.connector }),
      accountId,
      MESSAGE_ID,
      Promise.resolve(null),
    );

    expect(result?.kind).toBe("reconnect");
    const [account] = await db
      .select({ status: mailAccounts.status })
      .from(mailAccounts)
      .where(eq(mailAccounts.id, accountId));
    expect(account.status).toBe("reconnect");
  });
});
