import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { hashToken } from "@tuja/server-auth/hash-token";
import { makeAuth } from "@tuja/server-auth/make-auth";
import { createSoftwareAuthenticator } from "@tuja/server-auth/testing/create-software-authenticator";
import { uuidToBytes } from "@tuja/server-auth/uuid-to-bytes";
import type { Email } from "@tuja/server-email/types";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { passkeys, sessions, users } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { assistantSessionCookie } from "./assistant-session-cookie.ts";
import { isAllowedAssistantOrigin } from "./is-allowed-assistant-origin.ts";
import {
  assistantAuthConfig,
  makeAssistantAuth,
  type AuthHandlerDeps,
} from "./make-assistant-auth.ts";
import { resolveSession } from "./resolve-session.ts";

const ORIGIN = "http://localhost:3000";
const RP_ID = "localhost";
const now = new Date("2026-11-17T08:00:00Z");

type Authenticator = ReturnType<typeof createSoftwareAuthenticator>;

function isObject(value: unknown) {
  return typeof value === "object" && value !== null;
}
const requestOptions =
  z.custom<PublicKeyCredentialRequestOptionsJSON>(isObject);
const creationOptions =
  z.custom<PublicKeyCredentialCreationOptionsJSON>(isObject);
type Handler = (request: Request) => Promise<Response>;

let db: TestDb;
let sent: Email[];
let tasks: (() => Promise<void>)[];

function deps(): AuthHandlerDeps {
  return {
    getDb: () => db,
    now: () => now,
    authSecret: () => "test-auth-secret",
    isAllowedOrigin: isAllowedAssistantOrigin,
    limitRequest: () => Promise.resolve({ success: true, reset: 0 }),
    refundRequest: () => Promise.resolve(),
    clientIp: () => "test",
    emailSender: () => ({
      send: (email) => {
        sent.push(email);
        return Promise.resolve();
      },
    }),
    afterResponse: (task) => {
      tasks.push(task);
    },
  };
}

/** A browser on `ORIGIN`: it keeps the cookies that the routes set. */
function newBrowser() {
  const jar = new Map<string, string>();
  async function post(
    handler: Handler,
    body: unknown = {},
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const response = await handler(
      new Request(`${ORIGIN}/api/auth`, {
        method: "POST",
        headers: {
          Origin: ORIGIN,
          "Content-Type": "application/json",
          "User-Agent": "vitest",
          Cookie: [...jar]
            .map(([name, value]) => `${name}=${value}`)
            .join("; "),
        },
        body: JSON.stringify(body),
      }),
    );
    for (const cookie of response.headers.getSetCookie()) {
      const [pair = "", ...attributes] = cookie.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator).trim();
      const value = decodeURIComponent(pair.slice(separator + 1).trim());
      const expired = attributes.some((part) =>
        /^\s*max-age=0\s*$/i.test(part),
      );
      if (expired || value === "") jar.delete(name);
      else jar.set(name, value);
    }
    return {
      status: response.status,
      body: JSON.parse(await response.text()) as Record<string, unknown>,
    };
  }
  return { jar, post };
}

type Browser = ReturnType<typeof newBrowser>;

async function signedInUser(browser: Browser) {
  const token = browser.jar.get(assistantSessionCookie.name);
  if (!token) return null;
  const resolved = await resolveSession(db, token, {
    now,
    allowRefresh: false,
  });
  return resolved?.session.userId ?? null;
}

/** The owner as production has them: a user with no email, and one passkey that the old invite route stored. */
async function insertOwner(authenticator: Authenticator) {
  const userId = randomUUID();
  const options = await generateRegistrationOptions({
    rpName: "Mail Assistant",
    rpID: RP_ID,
    userID: uuidToBytes(userId),
    userName: "Qingqi",
    attestationType: "none",
  });
  const verification = await verifyRegistrationResponse({
    response: await authenticator.register(options, ORIGIN),
    expectedChallenge: options.challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
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

/** A session row as the old `createSession` wrote it, and its raw token. */
async function insertOldSession(userId: string) {
  const token = "old-session-token-from-before-the-shared-sign-in";
  await db.insert(sessions).values({
    id: randomUUID(),
    userId,
    tokenHash: hashToken(token),
    createdAt: now,
    refreshedAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + 400 * 24 * 60 * 60 * 1000),
    userAgent: "Safari",
  });
  return token;
}

async function signIn(
  handlers: ReturnType<typeof makeAssistantAuth>,
  browser: Browser,
  authenticator: Authenticator,
) {
  const { body } = await browser.post(handlers.signInOptions);
  const options = requestOptions.parse(body.options);
  return browser.post(handlers.signInVerify, {
    response: await authenticator.authenticate(options, ORIGIN),
  });
}

function codeOf(email: Email | undefined) {
  const code = /\b(\d{6})\b/.exec(email?.subject ?? "")?.[1];
  if (!code) throw new Error("No code in the email");
  return code;
}

beforeEach(async () => {
  db = await createTestDb();
  sent = [];
  tasks = [];
});

afterEach(async () => {
  await db.close();
});

describe("the owner's sign-in after the move to the shared sign-in", () => {
  it("signs in with the passkey that the old code stored, and sign-out ends the session", async () => {
    const handlers = makeAssistantAuth(deps());
    const device = createSoftwareAuthenticator();
    const userId = await insertOwner(device);
    const browser = newBrowser();

    expect((await signIn(handlers, browser, device)).status).toBe(200);
    expect(await signedInUser(browser)).toBe(userId);

    expect((await browser.post(handlers.signOut)).status).toBe(200);
    expect(await signedInUser(browser)).toBeNull();
    expect(await db.$count(sessions)).toBe(0);
  });

  it("keeps a session that the old code opened", async () => {
    const handlers = makeAssistantAuth(deps());
    const userId = await insertOwner(createSoftwareAuthenticator());
    const browser = newBrowser();
    browser.jar.set(
      assistantSessionCookie.name,
      await insertOldSession(userId),
    );

    expect(await signedInUser(browser)).toBe(userId);
    expect((await browser.post(handlers.passkeyOptions)).status).toBe(200);
  });

  it("refuses a passkey that is not stored", async () => {
    const handlers = makeAssistantAuth(deps());
    await insertOwner(createSoftwareAuthenticator());
    const stranger = createSoftwareAuthenticator();
    await stranger.register(
      await generateRegistrationOptions({
        rpName: "Test",
        rpID: RP_ID,
        userName: "Stranger",
      }),
      ORIGIN,
    );
    expect(await signIn(handlers, newBrowser(), stranger)).toMatchObject({
      status: 401,
      body: { error: "passkey_unknown" },
    });
    expect(await db.$count(sessions)).toBe(0);
  });
});

describe("no way in without the owner's passkey", () => {
  it("has no route that signs up or recovers", async () => {
    const routes: string[] = [];
    const root = path.resolve(import.meta.dirname, "../../app/api/auth");
    for (const entry of await readdir(root, { recursive: true })) {
      if (entry.endsWith("route.ts")) routes.push(path.dirname(entry));
    }
    expect(routes.sort()).toEqual([
      "email",
      "email/verify",
      "passkeys/options",
      "passkeys/verify",
      "sign-in/options",
      "sign-in/verify",
      "sign-out",
    ]);
    expect(Object.keys(makeAssistantAuth(deps())).sort()).toEqual([
      "emailRequest",
      "emailVerify",
      "passkeyOptions",
      "passkeyVerify",
      "signInOptions",
      "signInVerify",
      "signOut",
    ]);
  });

  it("makes no user and sends no recovery link, even through the shared sign-up and recovery routes", async () => {
    const { handlers } = makeAuth({ ...deps(), ...assistantAuthConfig });
    const ownerId = await insertOwner(createSoftwareAuthenticator());
    await db
      .update(users)
      .set({ email: "owner@example.com" })
      .where(eq(users.id, ownerId));

    const stranger = newBrowser();
    expect(
      (
        await stranger.post(handlers.requestSignUp, {
          email: "new@example.com",
        })
      ).status,
    ).toBe(202);
    const { body: checked } = await stranger.post(handlers.signUpCode, {
      code: codeOf(sent.at(-1)),
    });
    const token = String(checked.path).replace("/sign-up/", "");
    const { body: started } = await stranger.post(handlers.signUpOptions, {
      token,
    });
    const verified = await stranger.post(handlers.signUpVerify, {
      token,
      response: await createSoftwareAuthenticator().register(
        creationOptions.parse(started.options),
        ORIGIN,
      ),
    });
    expect(verified).toMatchObject({
      status: 403,
      body: { error: "sign_up_closed" },
    });

    const thief = newBrowser();
    await thief.post(handlers.requestRecovery, { email: "owner@example.com" });
    for (const task of tasks) await task();
    await thief.post(handlers.requestSignUp, { email: "owner@example.com" });
    expect(sent.map((email) => email.text).join("\n")).not.toContain(
      "/recover/",
    );

    expect(await db.select({ id: users.id }).from(users)).toEqual([
      { id: ownerId },
    ]);
    expect(await db.$count(passkeys)).toBe(1);
    expect(await db.$count(sessions)).toBe(0);
  });

  it("refuses every account route without a live session", async () => {
    const handlers = makeAssistantAuth(deps());
    await insertOwner(createSoftwareAuthenticator());
    const routes = [
      handlers.passkeyOptions,
      handlers.passkeyVerify,
      handlers.emailRequest,
      handlers.emailVerify,
    ];
    const stale = newBrowser();
    stale.jar.set(assistantSessionCookie.name, "not-a-session");
    for (const browser of [newBrowser(), stale]) {
      for (const route of routes) {
        expect(
          await browser.post(route, { email: "a@example.com", code: "123456" }),
        ).toMatchObject({ status: 401, body: { error: "unauthorized" } });
      }
    }
    expect(sent).toEqual([]);
  });
});

describe("the signed-in account", () => {
  async function signedInOwner() {
    const handlers = makeAssistantAuth(deps());
    const device = createSoftwareAuthenticator();
    const userId = await insertOwner(device);
    const browser = newBrowser();
    await signIn(handlers, browser, device);
    return { handlers, userId, browser, device };
  }

  it("sets the email with the code sent to it, and only with that code", async () => {
    const { handlers, userId, browser } = await signedInOwner();

    expect(
      (await browser.post(handlers.emailRequest, { email: "Qi@Example.com" }))
        .status,
    ).toBe(202);
    expect(sent.at(-1)?.to).toBe("qi@example.com");
    expect(sent.at(-1)?.text).not.toContain("http");
    const wrong = codeOf(sent.at(-1)) === "000000" ? "111111" : "000000";
    expect(
      await browser.post(handlers.emailVerify, { code: wrong }),
    ).toMatchObject({ status: 400, body: { error: "code_invalid" } });
    expect(
      await browser.post(handlers.emailVerify, { code: codeOf(sent.at(-1)) }),
    ).toMatchObject({ status: 200, body: { email: "qi@example.com" } });

    const [owner] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    expect(owner.email).toBe("qi@example.com");
  });

  it("refuses the code in another browser, a sign-up code, and an address another user has", async () => {
    const { handlers, browser } = await signedInOwner();
    await browser.post(handlers.emailRequest, { email: "new@example.com" });
    const code = codeOf(sent.at(-1));

    const other = newBrowser();
    other.jar.set(
      assistantSessionCookie.name,
      browser.jar.get(assistantSessionCookie.name) ?? "",
    );
    expect(await other.post(handlers.emailVerify, { code })).toMatchObject({
      status: 410,
      body: { error: "code_expired" },
    });

    const shared = makeAuth({ ...deps(), ...assistantAuthConfig }).handlers;
    await browser.post(shared.requestSignUp, { email: "signup@example.com" });
    expect(
      await browser.post(handlers.emailVerify, { code: codeOf(sent.at(-1)) }),
    ).toMatchObject({ status: 410, body: { error: "code_expired" } });

    await db.insert(users).values({
      id: randomUUID(),
      displayName: "Other",
      email: "taken@example.com",
    });
    await browser.post(handlers.emailRequest, { email: "taken@example.com" });
    expect(
      await browser.post(handlers.emailVerify, { code: codeOf(sent.at(-1)) }),
    ).toMatchObject({ status: 409, body: { error: "email_registered" } });
  });

  it("adds a passkey that then signs in", async () => {
    const { handlers, userId, browser } = await signedInOwner();
    const phone = createSoftwareAuthenticator();
    const { body } = await browser.post(handlers.passkeyOptions);
    expect(
      (
        await browser.post(handlers.passkeyVerify, {
          response: await phone.register(
            creationOptions.parse(body.options),
            ORIGIN,
          ),
        })
      ).status,
    ).toBe(200);
    expect(await db.$count(passkeys)).toBe(2);

    const later = newBrowser();
    expect((await signIn(handlers, later, phone)).status).toBe(200);
    expect(await signedInUser(later)).toBe(userId);
  });
});
