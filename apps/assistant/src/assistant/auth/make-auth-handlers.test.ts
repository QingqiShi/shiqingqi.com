import { randomUUID } from "node:crypto";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { passkeys, sessions, users } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { isAllowedAssistantOrigin } from "./is-allowed-assistant-origin.ts";
import { makeAuthHandlers } from "./make-auth-handlers.ts";
import {
  createAuthTestClient,
  TEST_ORIGIN,
} from "./testing/create-auth-test-client.ts";
import { createSoftwareAuthenticator } from "./testing/create-software-authenticator.ts";
import { uuidToBytes } from "./uuid-to-bytes.ts";

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

/** A user with one passkey on `authenticator`, as production has the owner. */
async function insertUserWithPasskey(authenticator: Authenticator) {
  const userId = randomUUID();
  const rpID = new URL(TEST_ORIGIN).hostname;
  const options = await generateRegistrationOptions({
    rpName: "Test",
    rpID,
    userID: uuidToBytes(userId),
    userName: "Qingqi",
    attestationType: "none",
  });
  const verification = await verifyRegistrationResponse({
    response: await authenticator.register(options, TEST_ORIGIN),
    expectedChallenge: options.challenge,
    expectedOrigin: TEST_ORIGIN,
    expectedRPID: rpID,
  });
  if (!verification.verified) throw new Error("Passkey not registered");
  const { credential } = verification.registrationInfo;
  await db.insert(users).values({ id: userId, displayName: "Qingqi" });
  await db.insert(passkeys).values({
    id: credential.id,
    userId,
    publicKey: credential.publicKey,
    counter: credential.counter,
    transports: credential.transports ?? [],
  });
  return userId;
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

describe("sign-in", () => {
  it("opens a session with the passkey, and sign-out ends it", async () => {
    const device = createSoftwareAuthenticator();
    const userId = await insertUserWithPasskey(device);

    const browser = newBrowser();
    expect((await browser.get("session")).status).toBe(401);
    expect((await signIn(browser, device)).status).toBe(200);
    expect(await browser.get("session")).toMatchObject({
      status: 200,
      body: { userId },
    });

    expect((await browser.post("signOut")).status).toBe(200);
    expect((await browser.get("session")).status).toBe(401);
    expect(await db.$count(sessions)).toBe(0);
  });

  it("refuses a passkey that is not stored", async () => {
    await insertUserWithPasskey(createSoftwareAuthenticator());
    const stranger = createSoftwareAuthenticator();
    await stranger.register(
      await generateRegistrationOptions({
        rpName: "Test",
        rpID: new URL(TEST_ORIGIN).hostname,
        userName: "Stranger",
      }),
      TEST_ORIGIN,
    );
    expect(await signIn(newBrowser(), stranger)).toMatchObject({
      status: 401,
      body: { error: "passkey_unknown" },
    });
  });

  it("refuses a request from another origin", async () => {
    const browser = newBrowser();
    expect(
      await browser.post("signInOptions", {}, "https://evil.example"),
    ).toMatchObject({ status: 403, body: { error: "forbidden_origin" } });
  });
});
