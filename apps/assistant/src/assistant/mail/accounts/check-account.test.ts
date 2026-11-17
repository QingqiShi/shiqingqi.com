import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import { scopeTo } from "#src/assistant/db/scope-to.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { MailboxAuthError } from "#src/assistant/mail/imap/mailbox-auth-error.ts";
import {
  createFakeMailServer,
  type FakeMailServer,
} from "#src/assistant/mail/testing/create-fake-mail-server.ts";
import {
  insertAccount,
  insertUser,
  mailDeps,
  storedAccount,
} from "#src/assistant/mail/testing/insert-account.ts";
import { checkAccount } from "./check-account.ts";

const MINUTE = 60 * 1000;
const FIRST_REFUSAL = new Date("2026-11-17T09:30:00Z");

let db: TestDb;
let userId: string;
let accountId: string;
let server: FakeMailServer;

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  accountId = await insertAccount(db, userId);
  // A day since the last run that opened it, as when only the morning report reads the mailbox.
  await db.update(mailAccounts).set({
    lastSyncedAt: new Date(FIRST_REFUSAL.getTime() - 24 * 60 * MINUTE),
  });
  server = createFakeMailServer({
    user: "me@icloud.com",
    password: "app-password",
  });
});

afterEach(async () => {
  await db.close();
});

function checkAt(minutesAfterFirstRefusal: number, refused: boolean) {
  server.failNextConnects(
    refused
      ? new MailboxAuthError("AUTHENTICATIONFAILED Authentication Failed")
      : null,
  );
  const at = new Date(
    FIRST_REFUSAL.getTime() + minutesAfterFirstRefusal * MINUTE,
  );
  return checkAccount(
    scopeTo(db, userId),
    accountId,
    mailDeps({ connector: server.connector, now: () => at }),
  );
}

describe("a refused password login", () => {
  it("keeps the account for the next run after one refusal", async () => {
    expect(await checkAt(0, true)).toEqual({
      ok: false,
      code: "password_refused",
    });
    expect(await storedAccount(db, userId, accountId)).toMatchObject({
      status: "error",
      lastErrorCode: "password_refused",
      lastErrorAt: FIRST_REFUSAL,
    });
  });

  it("asks for a new connect once the refusals have lasted two hours, and keeps asking", async () => {
    await checkAt(0, true);
    expect(await checkAt(90, true)).toEqual({
      ok: false,
      code: "password_refused",
    });

    expect(await checkAt(120, true)).toEqual({
      ok: false,
      code: "login_refused",
    });
    expect(await storedAccount(db, userId, accountId)).toMatchObject({
      status: "reconnect",
      lastErrorCode: "login_refused",
    });

    expect(await checkAt(150, true)).toEqual({
      ok: false,
      code: "login_refused",
    });
    expect(await storedAccount(db, userId, accountId)).toMatchObject({
      status: "reconnect",
    });
  });

  it("counts the two hours again after a login that works", async () => {
    await checkAt(0, true);
    expect(await checkAt(60, false)).toEqual({ ok: true });

    expect(await checkAt(120, true)).toEqual({
      ok: false,
      code: "password_refused",
    });
    expect(await storedAccount(db, userId, accountId)).toMatchObject({
      status: "error",
    });
  });
});
