import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { createSoftwareAuthenticator } from "@tuja/server-auth/testing/create-software-authenticator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ACCOUNT_NAME_PATTERN } from "../account-name-pattern.ts";
import { accounts, passkeys } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  makeOutboxEmailSender,
  readOutbox,
} from "../email/make-outbox-email-sender.ts";
import { buddySessionCookie } from "./buddy-session-cookie.ts";
import { isAllowedBuddyOrigin } from "./is-allowed-buddy-origin.ts";
import {
  makeAuthHandlers,
  type AuthHandlerDeps,
} from "./make-auth-handlers.ts";
import { resolveSession } from "./resolve-session.ts";
import {
  createAuthTestClient,
  TEST_ORIGIN,
} from "./testing/create-auth-test-client.ts";

type Authenticator = ReturnType<typeof createSoftwareAuthenticator>;
type Client = ReturnType<typeof createAuthTestClient>;
interface OptionsBody {
  options: PublicKeyCredentialCreationOptionsJSON;
}

let db: TestDb;
let outboxDir: string;
let afterTasks: Promise<void>[];
let now: Date;

function newBrowser(overrides: Partial<AuthHandlerDeps> = {}) {
  return createAuthTestClient(
    makeAuthHandlers({
      getDb: () => db,
      now: () => now,
      authSecret: () => "test-auth-secret",
      isAllowedOrigin: isAllowedBuddyOrigin,
      limitRequest: () => Promise.resolve(true),
      clientIp: () => "test",
      emailSender: () => makeOutboxEmailSender(outboxDir),
      afterResponse: (task) => {
        afterTasks.push(task());
      },
      ...overrides,
    }),
  );
}

/** The user that the session cookie of the browser signs in, as a page reads it. */
async function signedInUser(browser: Client) {
  const token = browser.jar.get(buddySessionCookie.name);
  if (!token) return null;
  const resolved = await resolveSession(db, token, {
    now,
    allowRefresh: false,
  });
  return resolved?.session.userId ?? null;
}

async function lastEmail() {
  await Promise.all(afterTasks);
  return (await readOutbox(outboxDir)).at(-1);
}

function codeIn(text = ""): string {
  const match = /^(\d{6})$/m.exec(text);
  if (!match?.[1]) throw new Error(`No code in: ${text}`);
  return match[1];
}

function tokenIn(kind: "sign-up" | "recover", text = ""): string {
  const match = new RegExp(`/${kind}/([\\w-]+)`).exec(text);
  if (!match?.[1]) throw new Error(`No ${kind} link in: ${text}`);
  return match[1];
}

async function requestSignUp(browser: Client, email: string) {
  const requested = await browser.post("requestSignUp", { email });
  expect(requested.status).toBe(202);
  return (await lastEmail())?.text ?? "";
}

async function finishSignUp(
  browser: Client,
  authenticator: Authenticator,
  token: string,
) {
  const options = await browser.post<OptionsBody>("signUpOptions", { token });
  if (options.status !== 200) return options;
  const response = await authenticator.register(
    options.body.options,
    TEST_ORIGIN,
  );
  return browser.post("signUpVerify", {
    token,
    response,
  });
}

async function signUp(
  browser: Client,
  authenticator: Authenticator,
  email = "owner@example.com",
) {
  const text = await requestSignUp(browser, email);
  return finishSignUp(browser, authenticator, tokenIn("sign-up", text));
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

/** The Set-Cookie headers without their values, which are random. */
function cookieShapes(setCookies: string[]): string[] {
  return setCookies.map((cookie) => cookie.replace(/=[^;]*;/, "=;"));
}

beforeEach(async () => {
  db = await createTestDb();
  outboxDir = await mkdtemp(path.join(tmpdir(), "buddy-outbox-"));
  afterTasks = [];
  now = new Date("2026-11-01T08:00:00Z");
});

afterEach(async () => {
  await Promise.all(afterTasks);
  await db.close();
  await rm(outboxDir, { recursive: true, force: true });
});

describe("sign-up", () => {
  it("makes a private account with the typed code, a passkey and a session", async () => {
    const browser = newBrowser();
    const text = await requestSignUp(browser, " Owner@Example.com ");
    const code = await browser.post<{ path: string }>("signUpCode", {
      code: codeIn(text),
    });
    expect(code.body.path).toMatch(/^\/sign-up\//);

    const result = await finishSignUp(
      browser,
      createSoftwareAuthenticator(),
      tokenIn("sign-up", code.body.path),
    );

    expect(result.status).toBe(200);
    expect(await signedInUser(browser)).not.toBeNull();
    const [account] = await db
      .select({
        name: accounts.name,
        email: accounts.email,
        isPublic: accounts.isPublic,
      })
      .from(accounts);
    expect(account).toMatchObject({
      email: "owner@example.com",
      isPublic: false,
    });
    expect(account.name).toMatch(ACCOUNT_NAME_PATTERN);
  });

  it("answers the same for an address that has an account, and emails it a recovery link", async () => {
    await signUp(newBrowser(), createSoftwareAuthenticator());
    const known = await newBrowser().post("requestSignUp", {
      email: "OWNER@example.com",
    });
    const knownEmail = await lastEmail();
    const unknown = await newBrowser().post("requestSignUp", {
      email: "nobody@example.com",
    });

    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
    expect(cookieShapes(unknown.setCookies)).toEqual(
      cookieShapes(known.setCookies),
    );
    expect(knownEmail?.text).not.toContain("/sign-up/");
    expect(knownEmail?.text).toContain("/recover/");
    expect(await db.$count(accounts)).toBe(1);
  });

  it("gives each account a generated 8-character name", async () => {
    for (const email of ["a@example.com", "b@example.com"]) {
      await signUp(newBrowser(), createSoftwareAuthenticator(), email);
    }

    const names = (await db.select({ name: accounts.name }).from(accounts)).map(
      (row) => row.name,
    );
    expect(names).toHaveLength(2);
    expect(names.every((name) => /^[a-z0-9]{8}$/.test(name))).toBe(true);
    expect(new Set(names).size).toBe(2);
  });

  it("refuses a used link, and a link older than 30 minutes", async () => {
    const browser = newBrowser();
    const text = await requestSignUp(browser, "owner@example.com");
    await finishSignUp(
      browser,
      createSoftwareAuthenticator(),
      tokenIn("sign-up", text),
    );
    const late = await requestSignUp(newBrowser(), "late@example.com");
    now = new Date(now.getTime() + 31 * 60 * 1000);

    for (const token of [tokenIn("sign-up", text), tokenIn("sign-up", late)]) {
      expect(await newBrowser().post("signUpOptions", { token })).toMatchObject(
        { status: 410, body: { error: "sign_up_invalid" } },
      );
    }
    expect(await db.$count(accounts)).toBe(1);
  });

  it("checks a code only in the browser that asked for it, and ends it after five tries", async () => {
    const asker = newBrowser();
    const code = codeIn(await requestSignUp(asker, "owner@example.com"));
    const wrong = String((Number(code) + 1) % 1_000_000).padStart(6, "0");

    expect(await newBrowser().post("signUpCode", { code })).toMatchObject({
      status: 410,
      body: { error: "code_expired" },
    });
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      statuses.push((await asker.post("signUpCode", { code: wrong })).status);
    }
    expect(statuses).toEqual([400, 400, 400, 400, 410]);
    expect(await asker.post("signUpCode", { code })).toMatchObject({
      status: 410,
      body: { error: "code_expired" },
    });
  });

  it("counts a request against the limit of its address", async () => {
    const counted: string[] = [];
    const browser = newBrowser({
      limitRequest: (bucket, identifier) => {
        counted.push(`${bucket} ${identifier}`);
        return Promise.resolve(bucket !== "sign-up-address");
      },
    });

    expect(
      await browser.post("requestSignUp", { email: "owner@example.com" }),
    ).toMatchObject({ status: 429, body: { error: "rate_limited" } });
    expect(counted).toEqual([
      "auth test",
      "sign-up-ip test",
      expect.stringMatching(/^sign-up-address [0-9a-f]{64}$/),
    ]);
    expect(await lastEmail()).toBeUndefined();
  });
});

describe("recovery", () => {
  it("answers the same for an unknown address, and sends it nothing", async () => {
    await signUp(newBrowser(), createSoftwareAuthenticator());
    const known = await newBrowser().post("requestRecovery", {
      email: "owner@example.com",
    });
    const unknown = await newBrowser().post("requestRecovery", {
      email: "nobody@example.com",
    });
    await Promise.all(afterTasks);

    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
    expect(cookieShapes(unknown.setCookies)).toEqual(
      cookieShapes(known.setCookies),
    );
    const sent = await readOutbox(outboxDir);
    expect(sent.map(({ to }) => to)).toEqual([
      "owner@example.com",
      "owner@example.com",
    ]);
  });

  it("replaces the passkeys and ends the sessions", async () => {
    const lostDevice = createSoftwareAuthenticator();
    const oldBrowser = newBrowser();
    await signUp(oldBrowser, lostDevice);

    const browser = newBrowser();
    await browser.post("requestRecovery", { email: "owner@example.com" });
    const code = codeIn((await lastEmail())?.text);
    const { body } = await browser.post<{ path: string }>("recoveryCode", {
      code,
    });
    const token = tokenIn("recover", body.path);
    const options = await browser.post<OptionsBody>("recoveryOptions", {
      token,
    });
    const newDevice = createSoftwareAuthenticator();
    const response = await newDevice.register(
      options.body.options,
      TEST_ORIGIN,
    );
    expect(
      await browser.post("recoveryVerify", { token, response }),
    ).toMatchObject({ status: 200 });

    expect(await signedInUser(oldBrowser)).toBeNull();
    expect(await signIn(newBrowser(), lostDevice)).toMatchObject({
      status: 401,
      body: { error: "passkey_unknown" },
    });
    expect((await signIn(newBrowser(), newDevice)).status).toBe(200);
    expect(await db.$count(passkeys)).toBe(1);
    expect(await browser.post("recoveryOptions", { token })).toMatchObject({
      status: 410,
      body: { error: "recovery_invalid" },
    });
  });
});

describe("sign-in", () => {
  it("opens a session with the passkey, and sign-out ends it", async () => {
    const device = createSoftwareAuthenticator();
    await signUp(newBrowser(), device);

    const browser = newBrowser();
    expect(await signedInUser(browser)).toBeNull();
    expect((await signIn(browser, device)).status).toBe(200);
    expect(await signedInUser(browser)).not.toBeNull();

    expect((await browser.post("signOut")).status).toBe(200);
    expect(await signedInUser(browser)).toBeNull();
  });

  it("refuses a request from another origin", async () => {
    expect(
      await newBrowser().post("signInOptions", {}, "https://evil.example"),
    ).toMatchObject({ status: 403, body: { error: "forbidden_origin" } });
  });
});
