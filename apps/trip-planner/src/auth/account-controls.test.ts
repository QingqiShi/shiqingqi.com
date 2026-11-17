import { PGlite } from "@electric-sql/pglite";
import { createSoftwareAuthenticator } from "@tuja/server-auth/testing/create-software-authenticator";
import type { Email } from "@tuja/server-email/types";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it } from "vitest";
import { passkeys, recoveries, users } from "#src/db/auth-schema.ts";
import { schema } from "#src/db/schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "#src/db/trips-migrations-folder.ts";
import type { TripsDb } from "#src/db/types.ts";
import { makeTripsAuth, type AuthHandlers } from "./make-trips-auth.ts";
import { tripsSessionCookie } from "./trips-session-cookie.ts";

const ORIGIN = "http://localhost:3000";

type Authenticator = ReturnType<typeof createSoftwareAuthenticator>;
type Options = Parameters<Authenticator["register"]>[0] &
  Parameters<Authenticator["authenticate"]>[0];

let client: PGlite;
let db: TripsDb;
let handlers: AuthHandlers;
const sent: Email[] = [];
const afterTasks: Promise<void>[] = [];

beforeAll(async () => {
  client = await PGlite.create();
  db = drizzle({ client, schema });
  await migrate(drizzle({ client }), {
    migrationsFolder: TRIPS_MIGRATIONS_FOLDER,
  });
  handlers = makeTripsAuth({
    getDb: () => db,
    now: () => new Date(),
    authSecret: () => "test-secret",
    isAllowedOrigin: (origin) => origin === ORIGIN,
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
      afterTasks.push(task());
    },
  });
});

afterAll(() => client.close());

interface Answer {
  error?: string;
  email?: string;
  options?: Options;
}

function newBrowser() {
  const jar = new Map<string, string>();
  async function post(route: keyof AuthHandlers, body: unknown = {}) {
    const response = await handlers[route](
      new Request(`${ORIGIN}/api/auth/${route}`, {
        method: "POST",
        headers: {
          Origin: ORIGIN,
          "Content-Type": "application/json",
          Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
        },
        body: JSON.stringify(body),
      }),
    );
    for (const cookie of response.headers.getSetCookie()) {
      const [pair = ""] = cookie.split(";");
      const name = pair.slice(0, pair.indexOf("="));
      const value = decodeURIComponent(pair.slice(name.length + 1));
      if (value === "" || /max-age=0/i.test(cookie)) jar.delete(name);
      else jar.set(name, value);
    }
    return { status: response.status, body: (await response.json()) as Answer };
  }
  return { jar, post };
}

function optionsOf({ options }: Answer) {
  if (!options) throw new Error("No passkey options in the answer.");
  return options;
}

function lastCode() {
  const code = /\b(\d{6})\b/.exec(sent.at(-1)?.subject ?? "")?.[1];
  if (!code) throw new Error("No code in the last email.");
  return code;
}

async function signUp(name: string) {
  const email = `${name}-${crypto.randomUUID()}@example.com`;
  const browser = newBrowser();
  const device = createSoftwareAuthenticator();
  await browser.post("requestSignUp", { email });
  const token = /\/sign-up\/([\w-]+)/.exec(sent.at(-1)?.text ?? "")?.[1];
  const { body } = await browser.post("signUpOptions", { token });
  const response = await device.register(optionsOf(body), ORIGIN);
  await browser.post("signUpVerify", { token, response });
  const [{ userId }] = await db
    .select({ userId: users.id })
    .from(users)
    .where(eq(users.email, email));
  return { userId, email, browser, device };
}

async function emailOf(userId: string) {
  const [{ email }] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId));
  return email;
}

it("refuses every account route to a request with no live session", async () => {
  const routes = [
    "passkeyOptions",
    "passkeyVerify",
    "emailRequest",
    "emailVerify",
  ] as const;
  const stale = newBrowser();
  stale.jar.set(tripsSessionCookie.name, "not-a-session");
  const before = sent.length;
  for (const browser of [newBrowser(), stale]) {
    for (const route of routes) {
      expect(
        (
          await browser.post(route, {
            email: "a@example.com",
            code: "123456",
          })
        ).status,
      ).toBe(401);
    }
  }
  expect(sent.length).toBe(before);
});

it("changes the email with the code that went to the new address, and the old address then reaches nothing", async () => {
  const mara = await signUp("mara");
  const oldEmail = mara.email;
  const newEmail = `mara-new-${crypto.randomUUID()}@example.com`;

  // A recovery link and a recovery code that went to the old address.
  await mara.browser.post("requestRecovery", { email: oldEmail });
  await Promise.all(afterTasks);
  const recoveryLink = /\/recover\/([\w-]+)/.exec(sent.at(-1)?.text ?? "")?.[1];
  expect(recoveryLink).toBeTruthy();
  const recoveryCode = lastCode();

  expect(
    (await mara.browser.post("emailRequest", { email: newEmail })).status,
  ).toBe(202);
  expect(sent.at(-1)?.to).toBe(newEmail);
  const code = lastCode();
  const wrong = code === "000000" ? "111111" : "000000";
  expect((await mara.browser.post("emailVerify", { code: wrong })).status).toBe(
    400,
  );
  expect(await mara.browser.post("emailVerify", { code })).toMatchObject({
    status: 200,
    body: { email: newEmail },
  });
  expect(await emailOf(mara.userId)).toBe(newEmail);

  const stranger = newBrowser();
  expect(
    (await stranger.post("recoveryOptions", { token: recoveryLink })).status,
  ).toBe(410);
  const sentBefore = sent.length;
  await stranger.post("requestRecovery", { email: oldEmail });
  await Promise.all(afterTasks);
  expect(sent.length).toBe(sentBefore);
  expect(
    (await stranger.post("recoveryCode", { code: recoveryCode })).status,
  ).toBe(400);
  expect(await db.$count(recoveries, eq(recoveries.userId, mara.userId))).toBe(
    0,
  );

  await stranger.post("requestRecovery", { email: newEmail });
  await Promise.all(afterTasks);
  expect(sent.at(-1)?.to).toBe(newEmail);
  expect(sent.at(-1)?.text).toContain("/recover/");
});

it("refuses a code of another session or purpose, and an address that another user has", async () => {
  const mara = await signUp("mara");
  const noor = await signUp("noor");
  const next = `next-${crypto.randomUUID()}@example.com`;

  await mara.browser.post("emailRequest", { email: next });
  const code = lastCode();
  const thief = newBrowser();
  thief.jar.set(
    tripsSessionCookie.name,
    noor.browser.jar.get(tripsSessionCookie.name) ?? "",
  );
  for (const [name, value] of mara.browser.jar) {
    if (name !== tripsSessionCookie.name) thief.jar.set(name, value);
  }
  expect((await thief.post("emailVerify", { code })).status).toBe(410);
  expect(await emailOf(noor.userId)).toBe(noor.email);

  await mara.browser.post("requestSignUp", { email: next });
  expect(
    (await mara.browser.post("emailVerify", { code: lastCode() })).status,
  ).toBe(410);
  expect(await emailOf(mara.userId)).toBe(mara.email);

  await mara.browser.post("emailRequest", { email: noor.email });
  expect(
    await mara.browser.post("emailVerify", { code: lastCode() }),
  ).toMatchObject({ status: 409, body: { error: "email_registered" } });
  expect(await emailOf(mara.userId)).toBe(mara.email);
  expect(await emailOf(noor.userId)).toBe(noor.email);
});

it("adds a passkey that then signs in", async () => {
  const mara = await signUp("mara");
  const phone = createSoftwareAuthenticator();
  const { body } = await mara.browser.post("passkeyOptions");
  const response = await phone.register(optionsOf(body), ORIGIN);
  expect((await mara.browser.post("passkeyVerify", { response })).status).toBe(
    200,
  );
  expect(await db.$count(passkeys, eq(passkeys.userId, mara.userId))).toBe(2);

  const later = newBrowser();
  const challenge = await later.post("signInOptions");
  expect(
    (
      await later.post("signInVerify", {
        response: await phone.authenticate(optionsOf(challenge.body), ORIGIN),
      })
    ).status,
  ).toBe(200);
});
