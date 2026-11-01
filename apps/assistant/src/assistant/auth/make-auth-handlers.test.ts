import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { passkeys, sessions, users, userSettings } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { asAssistantApp } from "../db/with-user.ts";
import { createInvite } from "./create-invite.ts";
import { isAllowedAssistantOrigin } from "./is-allowed-assistant-origin.ts";
import { makeAuthHandlers } from "./make-auth-handlers.ts";
import {
  createAuthTestClient,
  TEST_ORIGIN,
} from "./testing/create-auth-test-client.ts";
import { createSoftwareAuthenticator } from "./testing/create-software-authenticator.ts";

type Authenticator = ReturnType<typeof createSoftwareAuthenticator>;
type Client = ReturnType<typeof createAuthTestClient>;

let db: TestDb;
const now = new Date("2026-11-01T08:00:00Z");

function newBrowser() {
  return createAuthTestClient(
    makeAuthHandlers({
      getDb: () => db,
      now: () => now,
      authSecret: () => "test-auth-secret",
      isAllowedOrigin: isAllowedAssistantOrigin,
    }),
  );
}

function invite(
  input:
    | { kind: "new-user"; displayName: string }
    | { kind: "recovery"; userId: string; displayName: string },
) {
  return asAssistantApp(db, (tx) => createInvite(tx, { ...input, now }));
}

async function acceptInvite(
  browser: Client,
  authenticator: Authenticator,
  token: string,
) {
  const options = await browser.post<{
    options: PublicKeyCredentialCreationOptionsJSON;
  }>("inviteOptions", { token });
  expect(options.status).toBe(200);
  const response = await authenticator.register(
    options.body.options,
    TEST_ORIGIN,
  );
  return browser.post("inviteVerify", {
    token,
    response,
    timeZone: "Asia/Shanghai",
  });
}

async function signIn(browser: Client, authenticator: Authenticator) {
  const options = await browser.post<{
    options: PublicKeyCredentialRequestOptionsJSON;
  }>("signInOptions");
  const response = await authenticator.authenticate(
    options.body.options,
    TEST_ORIGIN,
  );
  return browser.post("signInVerify", { response });
}

beforeEach(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await db.close();
});

describe("an invite", () => {
  it("makes a user with settings, a passkey and a session, once", async () => {
    const { token } = await invite({ kind: "new-user", displayName: "Qingqi" });
    const browser = newBrowser();

    expect(
      (await acceptInvite(browser, createSoftwareAuthenticator(), token))
        .status,
    ).toBe(200);
    const session = await browser.get<{ userId: string }>("session");
    expect(session.status).toBe(200);
    const { userId } = session.body;

    expect(
      await db.select({ displayName: users.displayName }).from(users),
    ).toEqual([{ displayName: "Qingqi" }]);
    expect(
      await db
        .select({ timeZone: userSettings.timeZone })
        .from(userSettings)
        .where(eq(userSettings.userId, userId)),
    ).toEqual([{ timeZone: "Asia/Shanghai" }]);

    expect(await newBrowser().post("inviteOptions", { token })).toMatchObject({
      status: 410,
      body: { error: "invite_invalid" },
    });
    expect(await db.$count(users)).toBe(1);
  });

  it("for recovery replaces the user's passkeys and ends their sessions", async () => {
    const { token } = await invite({ kind: "new-user", displayName: "Qingqi" });
    const lostDevice = createSoftwareAuthenticator();
    const oldBrowser = newBrowser();
    await acceptInvite(oldBrowser, lostDevice, token);
    const { userId } = (await oldBrowser.get<{ userId: string }>("session"))
      .body;

    const recovery = await invite({
      kind: "recovery",
      userId,
      displayName: "Qingqi",
    });
    const newDevice = createSoftwareAuthenticator();
    expect(
      (await acceptInvite(newBrowser(), newDevice, recovery.token)).status,
    ).toBe(200);

    expect((await oldBrowser.get("session")).status).toBe(401);
    expect(await signIn(newBrowser(), lostDevice)).toMatchObject({
      status: 401,
      body: { error: "passkey_unknown" },
    });
    expect((await signIn(newBrowser(), newDevice)).status).toBe(200);
    expect(await db.$count(users)).toBe(1);
    expect(await db.$count(passkeys)).toBe(1);
  });
});

describe("sign-in", () => {
  it("opens a session with the passkey, and sign-out ends it", async () => {
    const { token } = await invite({ kind: "new-user", displayName: "Qingqi" });
    const device = createSoftwareAuthenticator();
    await acceptInvite(newBrowser(), device, token);

    const browser = newBrowser();
    expect((await browser.get("session")).status).toBe(401);
    expect((await signIn(browser, device)).status).toBe(200);
    expect((await browser.get("session")).status).toBe(200);

    expect((await browser.post("signOut")).status).toBe(200);
    expect((await browser.get("session")).status).toBe(401);
    expect(await db.$count(sessions)).toBe(1);
  });

  it("refuses a request from another origin", async () => {
    const browser = newBrowser();
    expect(
      await browser.post("signInOptions", {}, "https://evil.example"),
    ).toMatchObject({ status: 403, body: { error: "forbidden_origin" } });
  });
});
