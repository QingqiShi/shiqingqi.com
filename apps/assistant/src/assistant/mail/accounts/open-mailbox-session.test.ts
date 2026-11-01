import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { createFakeMailServer } from "#src/assistant/mail/testing/create-fake-mail-server.ts";
import {
  insertAccount,
  insertUser,
  mailDeps,
  storedAccount,
} from "#src/assistant/mail/testing/insert-account.ts";
import { checkAccount } from "./check-account.ts";

let db: TestDb;
let userId: string;
let accountId: string;

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  accountId = await insertAccount(db, userId, {
    provider: "outlook",
    address: "me@outlook.com",
    credential: {
      type: "oauth",
      refreshToken: "refresh-1",
      accessToken: "access-1",
      accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
    },
  });
});

afterEach(async () => {
  await db.close();
});

function tokenEndpoint(accessToken: string) {
  const refreshTokens: (string | null)[] = [];
  const fetch = (_url: string | URL | Request, init?: RequestInit) => {
    refreshTokens.push(
      new URLSearchParams(
        init?.body instanceof URLSearchParams ? init.body : undefined,
      ).get("refresh_token"),
    );
    return Promise.resolve(
      Response.json({
        access_token: accessToken,
        refresh_token: "refresh-2",
        expires_in: 3600,
      }),
    );
  };
  return { fetch, refreshTokens };
}

describe("a refused OAuth login", () => {
  it("gets a new token and logs in again, and the account stays ok", async () => {
    const server = createFakeMailServer({
      user: "me@outlook.com",
      accessToken: "access-2",
    });
    const endpoint = tokenEndpoint("access-2");

    const result = await checkAccount(
      db,
      userId,
      accountId,
      mailDeps({ connector: server.connector, fetch: endpoint.fetch }),
    );

    expect(result).toEqual({ ok: true });
    expect(endpoint.refreshTokens).toEqual(["refresh-1"]);
    const account = await storedAccount(db, userId, accountId);
    expect(account).toMatchObject({ status: "ok", lastErrorCode: null });
    expect(account.opened).toMatchObject({
      refreshToken: "refresh-2",
      accessToken: "access-2",
    });
  });

  it("asks for a new connect after a second refusal, with the server's words", async () => {
    const server = createFakeMailServer({
      user: "me@outlook.com",
      accessToken: "access-3",
      refusal: "The mail server refused the login: AUTHENTICATE failed.",
    });
    const endpoint = tokenEndpoint("access-2");

    const result = await checkAccount(
      db,
      userId,
      accountId,
      mailDeps({ connector: server.connector, fetch: endpoint.fetch }),
    );

    expect(result).toEqual({ ok: false, code: "login_refused" });
    expect(endpoint.refreshTokens).toEqual(["refresh-1"]);
    const account = await storedAccount(db, userId, accountId);
    expect(account).toMatchObject({
      status: "reconnect",
      lastErrorCode: "login_refused",
    });
    expect(account.lastErrorMessage).toContain("AUTHENTICATE failed.");
  });
});
