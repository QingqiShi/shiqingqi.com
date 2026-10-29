import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  accountGroups,
  categories,
  households,
  invites,
  members,
  passkeys,
  sessions,
  signUps,
  users,
} from "#src/finance/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/finance/db/testing/create-test-db.ts";
import { createTestHousehold } from "#src/finance/db/testing/create-test-household.ts";
import { withHousehold } from "#src/finance/db/with-household.ts";
import {
  makeOutboxEmailSender,
  readOutbox,
} from "../email/make-outbox-email-sender.ts";
import { guardFinanceRequest } from "../http/guard-finance-request.ts";
import { createInvite } from "./create-invite.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import { makeGetFinanceSession } from "./get-finance-session.ts";
import { hashToken } from "./hash-token.ts";
import { isAllowedFinanceOrigin } from "./is-allowed-finance-origin.ts";
import {
  makeAuthHandlers,
  type AuthHandlerDeps,
} from "./make-auth-handlers.ts";
import {
  createAuthTestClient,
  TEST_ORIGIN,
} from "./testing/create-auth-test-client.ts";
import { createSoftwareAuthenticator } from "./testing/create-software-authenticator.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

type Authenticator = ReturnType<typeof createSoftwareAuthenticator>;
type Client = ReturnType<typeof createAuthTestClient>;
interface RegistrationOptionsBody {
  options: PublicKeyCredentialCreationOptionsJSON;
  email?: string;
  memberName?: string;
  householdName?: string;
}
interface SignedInBody {
  householdId: string;
  memberId: string;
}

let db: TestDb;
let now: Date;
let outboxDir: string;
let afterTasks: Promise<void>[];

function makeHandlers(overrides: Partial<AuthHandlerDeps> = {}) {
  return makeAuthHandlers({
    getDb: () => db,
    now: () => now,
    authSecret: () => "test-auth-secret",
    limitRequest: () => Promise.resolve({ success: true, reset: 0 }),
    refundRequest: () => Promise.resolve(),
    isAllowedOrigin: isAllowedFinanceOrigin,
    emailSender: () => makeOutboxEmailSender(outboxDir),
    afterResponse: (task) => {
      afterTasks.push(task());
    },
    ...overrides,
  });
}

function verificationTokenIn(text = "", localePrefix = ""): string {
  const match = new RegExp(
    `${TEST_ORIGIN}${localePrefix}/finance/verify-email/([\\w-]+)`,
  ).exec(text);
  if (!match?.[1]) throw new Error(`No confirmation link in: ${text}`);
  return match[1];
}

function codeIn(text = ""): string {
  const match = /^(\d{6})$/m.exec(text);
  if (!match?.[1]) throw new Error(`No code in: ${text}`);
  return match[1];
}

function otherCode(code: string): string {
  return String((Number(code) + 1) % 1_000_000).padStart(6, "0");
}

/** Declares the checks of an emailed code that sign-up and recovery share. */
function itChecksEmailCodes(
  start: () => Promise<() => Promise<{ browser: Client; code: string }>>,
  enterCode: (browser: Client, code: string) => Promise<{ status: number }>,
) {
  it("checks a code only against the request of the browser that holds it", async () => {
    const browserWithCode = await start();
    const first = await browserWithCode();
    const second = await browserWithCode();

    expect(await enterCode(second.browser, first.code)).toMatchObject({
      status: 400,
      body: { error: "code_invalid" },
    });
    expect(
      await enterCode(createAuthTestClient(makeHandlers()), first.code),
    ).toMatchObject({ status: 410, body: { error: "code_expired" } });
    expect((await enterCode(first.browser, first.code)).status).toBe(200);
  });

  it("ends a code after five tries, and after 30 minutes", async () => {
    const browserWithCode = await start();
    const guessed = await browserWithCode();
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      statuses.push(
        (await enterCode(guessed.browser, otherCode(guessed.code))).status,
      );
    }
    expect(statuses).toEqual([400, 400, 400, 400, 410]);
    expect(await enterCode(guessed.browser, guessed.code)).toMatchObject({
      status: 410,
      body: { error: "code_expired" },
    });

    const late = await browserWithCode();
    advance(31 * 60 * 1000);
    expect((await enterCode(late.browser, late.code)).status).toBe(410);
  });
}

/** The Set-Cookie headers without their values, which are random. */
function cookieShapes(setCookies: string[]): string[] {
  return setCookies.map((cookie) => cookie.replace(/=[^;]*;/, "=;"));
}

function signUpTokenIn(text = ""): string {
  const match = /\/finance\/sign-up\/([\w-]+)/.exec(text);
  if (!match?.[1]) throw new Error(`No sign-up link in: ${text}`);
  return match[1];
}

function recoveryTokenIn(text = ""): string {
  const tokens = [...text.matchAll(/\/finance\/invite\/([\w-]+)/g)];
  if (tokens.length !== 1 || !tokens[0]?.[1]) {
    throw new Error(`Not one Recovery link in: ${text}`);
  }
  return tokens[0][1];
}

/** Opens the confirmation link with no session, as on another device. */
async function confirmRecoveryEmail(
  token: string,
  overrides: Partial<AuthHandlerDeps> = {},
  locale: "en" | "zh" = "en",
) {
  const confirmed = await createAuthTestClient(makeHandlers(overrides)).post<{
    verified: boolean;
  }>("verifyEmail", { token, locale });
  expect(confirmed.status).toBe(200);
  return confirmed.body.verified;
}

function advance(ms: number) {
  now = new Date(now.getTime() + ms);
}

/** Asks for a sign-up link for `email` and returns its token. The outbox is empty again after it. */
async function requestSignUpToken(email = "owner@example.com") {
  const requested = await createAuthTestClient(makeHandlers()).post(
    "requestSignUp",
    { email, locale: "en" },
  );
  expect(requested.status).toBe(202);
  const sent = await readOutbox(outboxDir);
  await rm(outboxDir, { recursive: true, force: true });
  return signUpTokenIn(sent.at(-1)?.text);
}

async function finishSignUp(
  client: Client,
  authenticator: Authenticator,
  token: string,
  details: object = {},
) {
  const options = await client.post<RegistrationOptionsBody>("signUpOptions", {
    token,
  });
  expect(options.status).toBe(200);
  const response = await authenticator.register(
    options.body.options,
    TEST_ORIGIN,
  );
  return client.post<SignedInBody>("signUpVerify", {
    token,
    response,
    memberName: "Qingqi",
    baseCurrency: "GBP",
    ...details,
  });
}

/** Signs up with a new Household, as its Owner, on `client`. */
async function signUp(
  client: Client,
  authenticator: Authenticator,
  email = "owner@example.com",
) {
  return finishSignUp(client, authenticator, await requestSignUpToken(email));
}

async function signIn(client: Client, authenticator: Authenticator) {
  const options = await client.post<{
    options: PublicKeyCredentialRequestOptionsJSON;
  }>("signInOptions");
  expect(options.status).toBe(200);
  const response = await authenticator.authenticate(
    options.body.options,
    TEST_ORIGIN,
  );
  return client.post("signInVerify", { response });
}

async function acceptInvite(
  client: Client,
  authenticator: Authenticator,
  token: string,
  /** Null sends no email. */
  email: string | null = "member@example.com",
) {
  const options = await client.post<RegistrationOptionsBody>("inviteOptions", {
    token,
    email: email ?? undefined,
  });
  if (options.status !== 200) return options;
  const response = await authenticator.register(
    options.body.options,
    TEST_ORIGIN,
  );
  return client.post<SignedInBody>("inviteVerify", {
    token,
    response,
    email: email ?? undefined,
  });
}

/** A household from the importer: two members, neither signed in. */
async function importedHousehold() {
  return createTestHousehold(db, {
    name: "Home",
    members: [
      { name: "Qingqi", role: "owner" },
      { name: "Partner", role: "member" },
    ],
  });
}

/** An invite for the owner of `household`, as `finance:invite-link` makes it. */
function operatorInvite(household: {
  householdId: string;
  memberIds: string[];
}) {
  return withHousehold(db, household.householdId, (scope) =>
    createInvite(scope, {
      memberId: household.memberIds[0] ?? "",
      createdBy: null,
      allowRecovery: true,
      now,
    }),
  );
}

/** The importer's household with its owner signed in on `owner`, through an invite that the operator made. */
async function claimedHousehold() {
  const imported = await importedHousehold();
  const invite = await operatorInvite(imported);
  if (!invite.ok) throw new Error(invite.reason);
  const owner = createAuthTestClient(makeHandlers());
  await acceptInvite(
    owner,
    createSoftwareAuthenticator(),
    invite.token,
    "owner@example.com",
  );
  await rm(outboxDir, { recursive: true, force: true });
  return { imported, owner };
}

beforeEach(async () => {
  db = await createTestDb();
  now = new Date("2026-10-10T12:00:00Z");
  outboxDir = await mkdtemp(path.join(tmpdir(), "finance-outbox-"));
  afterTasks = [];
});

afterEach(async () => {
  await Promise.all(afterTasks);
  await db.close();
  await rm(outboxDir, { recursive: true, force: true });
});

describe("sign-up", () => {
  it("creates the household, owner with a confirmed email, system categories, default groups, passkey and session", async () => {
    const requested = await createAuthTestClient(makeHandlers()).post(
      "requestSignUp",
      { email: " New@Example.com ", locale: "zh" },
    );
    expect(requested).toMatchObject({ status: 202, body: { ok: true } });
    const [sent] = await readOutbox(outboxDir);
    expect(sent.to).toBe("new@example.com");
    expect(sent.subject).toMatch(/^家庭账本注册验证码：\d{6}$/);
    expect(sent.text).toContain(`${TEST_ORIGIN}/zh/finance/sign-up/`);
    const client = createAuthTestClient(makeHandlers());
    const authenticator = createSoftwareAuthenticator();

    const result = await finishSignUp(
      client,
      authenticator,
      signUpTokenIn(sent.text),
      { baseCurrency: "EUR", timezone: "Europe/Paris", locale: "zh" },
    );

    expect(result.status).toBe(200);
    const household = (await db.select().from(households)).at(0);
    expect(household).toMatchObject({
      id: result.body.householdId,
      name: "Qingqi",
      baseCurrency: "EUR",
      timezone: "Europe/Paris",
    });
    const owner = (await db.select().from(members)).at(0);
    expect(owner).toMatchObject({
      id: result.body.memberId,
      name: "Qingqi",
      role: "owner",
    });
    const user = (await db.select().from(users)).at(0);
    expect(user).toMatchObject({
      id: owner?.userId,
      displayName: "Qingqi",
      email: "new@example.com",
      emailVerifiedAt: now,
    });
    const systemCategories = await db
      .select({ kind: categories.kind, name: categories.name })
      .from(categories)
      .where(eq(categories.isSystem, true));
    expect(systemCategories).toEqual(
      expect.arrayContaining([
        { kind: "expense", name: "Uncategorised" },
        { kind: "income", name: "Uncategorised" },
      ]),
    );
    const groups = await db
      .select({
        householdId: accountGroups.householdId,
        name: accountGroups.name,
        side: accountGroups.side,
      })
      .from(accountGroups)
      .orderBy(accountGroups.position);
    expect(groups).toEqual(
      [
        ["流动资产", "asset"],
        ["投资", "asset"],
        ["退休资产", "asset"],
        ["不动产", "asset"],
        ["信用", "liability"],
        ["贷款", "liability"],
      ].map(([name, side]) => ({ householdId: household?.id, name, side })),
    );
    const passkey = (await db.select().from(passkeys)).at(0);
    expect(passkey).toMatchObject({
      id: authenticator.credentials[0]?.id,
      userId: owner?.userId,
      transports: ["internal", "hybrid"],
    });
    expect(client.jar.has(financeSessionCookie.name)).toBe(true);
    expect(result.setCookies.join("\n")).toMatch(
      /finance_session=[^;]+; Max-Age=34560000; Path=\/; HttpOnly; SameSite=Lax$/m,
    );

    const session = await client.get("session");
    expect(session.body).toEqual({
      userId: owner?.userId,
      householdId: household?.id,
      memberId: owner?.id,
      role: "owner",
    });
  });

  it("answers the same for an address that a user has, and emails that address a Recovery link, not a sign-up link", async () => {
    const first = await signUp(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      "taken@example.com",
    );
    const known = await createAuthTestClient(makeHandlers()).post(
      "requestSignUp",
      { email: "Taken@example.com" },
    );
    const unknown = await createAuthTestClient(makeHandlers()).post(
      "requestSignUp",
      { email: "nobody@example.com" },
    );

    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
    expect(cookieShapes(unknown.setCookies)).toEqual(
      cookieShapes(known.setCookies),
    );
    const sent = await readOutbox(outboxDir);
    expect(sent.map(({ to }) => to)).toEqual([
      "taken@example.com",
      "nobody@example.com",
    ]);
    expect(sent[0]?.subject).toMatch(/^\d{6} is your Finance code$/);
    expect(sent[1]?.subject).toMatch(/^\d{6} is your Finance sign-up code$/);
    expect(sent[0]?.text).not.toContain("/finance/sign-up/");
    expect(
      await db
        .select()
        .from(signUps)
        .where(eq(signUps.email, "taken@example.com")),
    ).toEqual([expect.objectContaining({ usedAt: now })]);

    const link = recoveryTokenIn(sent[0]?.text);
    const recovered = await acceptInvite(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      link,
    );
    expect(recovered).toMatchObject({ status: 200, body: first.body });
    expect(await db.select().from(households)).toHaveLength(1);
  });

  it("refuses a sign-up link for an address that a user confirmed after the link was sent", async () => {
    const stale = await requestSignUpToken("taken@example.com");
    const late = createAuthTestClient(makeHandlers());
    const options = await late.post<RegistrationOptionsBody>("signUpOptions", {
      token: stale,
    });
    expect(options.status).toBe(200);
    const owner = createAuthTestClient(makeHandlers());
    await signUp(owner, createSoftwareAuthenticator());
    await owner.post("setRecoveryEmail", { email: "taken@example.com" });
    expect(
      await confirmRecoveryEmail(
        verificationTokenIn((await readOutbox(outboxDir)).at(-1)?.text),
      ),
    ).toBe(true);

    const reopened = await createAuthTestClient(makeHandlers()).post(
      "signUpOptions",
      { token: stale },
    );
    const finished = await late.post("signUpVerify", {
      token: stale,
      response: await createSoftwareAuthenticator().register(
        options.body.options,
        TEST_ORIGIN,
      ),
      memberName: "Late",
      baseCurrency: "GBP",
    });

    for (const refused of [reopened, finished]) {
      expect(refused).toMatchObject({
        status: 409,
        body: { error: "email_registered" },
      });
    }
    expect(await db.select().from(households)).toHaveLength(1);
    expect(
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, "taken@example.com")),
    ).toHaveLength(1);
  });

  it("refuses a used link and a link older than 30 minutes", async () => {
    const used = await requestSignUpToken();
    await finishSignUp(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      used,
    );
    const expired = await requestSignUpToken("late@example.com");
    advance(31 * 60 * 1000);

    for (const token of [used, expired, "unknown"]) {
      expect(
        await createAuthTestClient(makeHandlers()).post("signUpOptions", {
          token,
        }),
      ).toMatchObject({ status: 410, body: { error: "sign_up_invalid" } });
    }
    expect(await db.select().from(households)).toHaveLength(1);
  });

  it("ends the earlier link of an address when it asks again, and deletes expired links", async () => {
    const earlier = await requestSignUpToken();
    const later = await requestSignUpToken();
    const options = (token: string) =>
      createAuthTestClient(makeHandlers()).post("signUpOptions", { token });

    expect(await options(earlier)).toMatchObject({
      status: 410,
      body: { error: "sign_up_invalid" },
    });
    expect((await options(later)).status).toBe(200);

    advance(31 * 60 * 1000);
    await requestSignUpToken("other@example.com");
    expect(await db.select({ email: signUps.email }).from(signUps)).toEqual([
      { email: "other@example.com" },
    ]);
  });

  it("refuses a ceremony that finishes after another browser used the link", async () => {
    const token = await requestSignUpToken();
    const late = createAuthTestClient(makeHandlers());
    const options = await late.post<RegistrationOptionsBody>("signUpOptions", {
      token,
    });
    expect(options.body.email).toBe("owner@example.com");
    await finishSignUp(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      token,
    );

    const result = await late.post("signUpVerify", {
      token,
      response: await createSoftwareAuthenticator().register(
        options.body.options,
        TEST_ORIGIN,
      ),
      memberName: "Late",
      baseCurrency: "GBP",
    });

    expect(result).toMatchObject({
      status: 410,
      body: { error: "sign_up_invalid" },
    });
    expect(await db.select().from(households)).toHaveLength(1);
  });

  it("refuses a challenge of another ceremony, a missing name, and an unknown or unsupported currency", async () => {
    const token = await requestSignUpToken();
    const client = createAuthTestClient(makeHandlers());
    await client.post("signInOptions");
    const crossed = await client.post("signUpVerify", {
      token,
      response: { id: "x" },
      memberName: "Qingqi",
      baseCurrency: "GBP",
    });
    const noName = await finishSignUp(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      token,
      { memberName: " " },
    );
    const badCurrency = await finishSignUp(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      token,
      { baseCurrency: "ZZZ" },
    );
    const unsupportedCurrency = await finishSignUp(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      token,
      { baseCurrency: "AED" },
    );

    expect(crossed).toMatchObject({
      status: 400,
      body: { error: "challenge_invalid" },
    });
    expect(noName.status).toBe(400);
    expect(badCurrency.status).toBe(400);
    expect(unsupportedCurrency.status).toBe(400);
    expect(await db.select().from(households)).toHaveLength(0);
  });

  it("refuses an address that is not an email and a server with no email", async () => {
    const notEmail = await createAuthTestClient(makeHandlers()).post(
      "requestSignUp",
      { email: "qingqi" },
    );
    const noEmail = await createAuthTestClient(
      makeHandlers({ emailSender: () => null }),
    ).post("requestSignUp", { email: "qingqi@example.com" });

    expect(notEmail).toMatchObject({
      status: 400,
      body: { error: "email_invalid" },
    });
    expect(noEmail).toMatchObject({
      status: 503,
      body: { error: "email_not_configured" },
    });
    expect(await readOutbox(outboxDir)).toEqual([]);
  });

  it("limits requests by address and by IP", async () => {
    const counted: string[] = [];
    const handlers = makeHandlers({
      limitRequest: (bucket, identifier) => {
        counted.push(`${bucket} ${identifier}`);
        return Promise.resolve({
          success: bucket !== "sign-up-address",
          reset: now.getTime() + 1000,
        });
      },
    });

    const result = await createAuthTestClient(handlers).post("requestSignUp", {
      email: "qingqi@example.com",
    });

    expect(result).toMatchObject({
      status: 429,
      body: { error: "rate_limited" },
    });
    expect(counted).toEqual([
      expect.stringMatching(/^auth /),
      expect.stringMatching(/^sign-up-ip /),
      expect.stringMatching(/^sign-up-address [0-9a-f]{64}$/),
    ]);
    expect(await readOutbox(outboxDir)).toEqual([]);
  });
});

describe("sign-up by code", () => {
  /** Asks for sign-up in a new browser and returns it with the code and the link token that the email gave. */
  async function browserWithCode(email = "owner@example.com") {
    const browser = createAuthTestClient(makeHandlers());
    const requested = await browser.post("requestSignUp", {
      email,
      locale: "en",
    });
    expect(requested.status).toBe(202);
    const sent = (await readOutbox(outboxDir)).at(-1);
    return {
      browser,
      code: codeIn(sent?.text),
      linkToken: signUpTokenIn(sent?.text),
    };
  }

  function enterCode(browser: Client, code: string) {
    return browser.post<{ path?: string }>("signUpCode", { code });
  }

  it("continues the sign-up in the browser that asked, names the household after the person, and ends the emailed link", async () => {
    const { browser, code, linkToken } = await browserWithCode();

    const entered = await enterCode(browser, code);

    expect(entered.status).toBe(200);
    const token = signUpTokenIn(entered.body.path);
    const result = await finishSignUp(
      browser,
      createSoftwareAuthenticator(),
      token,
      { memberName: " Alex " },
    );
    expect(result.status).toBe(200);
    expect(
      await db
        .select({ name: households.name })
        .from(households)
        .where(eq(households.id, result.body.householdId)),
    ).toEqual([{ name: "Alex" }]);
    expect((await browser.get("session")).body).toMatchObject({
      role: "owner",
    });
    expect(await enterCode(browser, code)).toMatchObject({
      status: 410,
      body: { error: "code_expired" },
    });
    expect(
      (
        await createAuthTestClient(makeHandlers()).post("signUpOptions", {
          token: linkToken,
        })
      ).status,
    ).toBe(410);
  });

  it("opens the Recovery link in the browser that asked when a user has the address", async () => {
    const lostDevice = createAuthTestClient(makeHandlers());
    const first = await signUp(
      lostDevice,
      createSoftwareAuthenticator(),
      "taken@example.com",
    );
    const browser = createAuthTestClient(makeHandlers());
    await browser.post("requestSignUp", {
      email: "taken@example.com",
      locale: "en",
    });
    const code = codeIn((await readOutbox(outboxDir)).at(-1)?.text);

    const entered = await enterCode(browser, code);

    expect(entered.status).toBe(200);
    const token = recoveryTokenIn(entered.body.path);
    const recovered = await acceptInvite(
      browser,
      createSoftwareAuthenticator(),
      token,
    );
    expect(recovered).toMatchObject({ status: 200, body: first.body });
    expect((await lostDevice.get("session")).status).toBe(401);
    expect(await db.select().from(households)).toHaveLength(1);
  });

  itChecksEmailCodes(() => {
    const emails = ["first@example.com", "second@example.com"];
    return Promise.resolve(() => browserWithCode(emails.shift()));
  }, enterCode);
});

describe("recovery email", () => {
  async function signedInOwner(overrides: Partial<AuthHandlerDeps> = {}) {
    const client = createAuthTestClient(makeHandlers(overrides));
    const phone = createSoftwareAuthenticator();
    const result = await signUp(client, phone);
    const session = await client.get<{ userId: string }>("session");
    return { client, phone, result, userId: session.body.userId };
  }

  it("counts only after its confirmation link is opened, and the link works once", async () => {
    const { client } = await signedInOwner();

    const saved = await client.post("setRecoveryEmail", {
      email: "  Qingqi@Example.COM ",
      locale: "zh",
    });

    expect(saved).toMatchObject({
      status: 200,
      body: { email: "qingqi@example.com", verified: false },
    });
    const [sent] = await readOutbox(outboxDir);
    expect(sent).toMatchObject({
      to: "qingqi@example.com",
      subject: "确认家庭账本恢复邮箱",
    });
    const token = verificationTokenIn(sent.text, "/zh");
    expect((await client.get("recoveryEmail")).body).toEqual({
      email: "qingqi@example.com",
      verified: false,
    });

    expect(await confirmRecoveryEmail(token)).toBe(true);
    expect(await confirmRecoveryEmail(token)).toBe(false);
    expect((await client.get("recoveryEmail")).body).toEqual({
      email: "qingqi@example.com",
      verified: true,
    });
  });

  it("needs a new confirmation when the email changes", async () => {
    const { client } = await signedInOwner();
    await client.post("setRecoveryEmail", { email: "old@example.com" });
    const oldLink = verificationTokenIn((await readOutbox(outboxDir))[0]?.text);
    await confirmRecoveryEmail(oldLink);
    await client.post("setRecoveryEmail", { email: "first@example.com" });
    const firstLink = verificationTokenIn(
      (await readOutbox(outboxDir)).find(({ to }) => to === "first@example.com")
        ?.text,
    );

    const changed = await client.post("setRecoveryEmail", {
      email: "second@example.com",
    });

    expect(changed.body).toEqual({
      email: "second@example.com",
      verified: false,
    });
    expect(await confirmRecoveryEmail(firstLink)).toBe(false);
    expect((await client.get("recoveryEmail")).body).toMatchObject({
      verified: false,
    });
  });

  async function lastLinkTo(email: string) {
    return verificationTokenIn(
      (await readOutbox(outboxDir)).findLast(({ to }) => to === email)?.text,
    );
  }

  async function sentAfterResponse() {
    await Promise.all(afterTasks);
    return readOutbox(outboxDir);
  }

  it("tells the confirmed email it replaces, once the new one is confirmed", async () => {
    const { client } = await signedInOwner();
    await client.post("setRecoveryEmail", { email: "first@example.com" });
    await client.post("setRecoveryEmail", { email: "jane@example.com" });

    expect((await sentAfterResponse()).map(({ to }) => to)).not.toContain(
      "owner@example.com",
    );
    expect(
      await confirmRecoveryEmail(
        await lastLinkTo("jane@example.com"),
        {},
        "zh",
      ),
    ).toBe(true);

    const notices = (await sentAfterResponse()).filter(
      ({ to }) => to === "owner@example.com",
    );
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ subject: "家庭账本恢复邮箱已更改" });
    expect(notices[0]?.text).toContain("j•••@example.com");
    expect(notices[0]?.text).not.toContain("jane@example.com");
    expect(notices[0]?.text).toContain(
      `${TEST_ORIGIN}/zh/finance/settings/members`,
    );
  });

  it("refuses to confirm an email that another user has confirmed, and changes neither user", async () => {
    const { client: owner } = await signedInOwner();
    const other = createAuthTestClient(makeHandlers());
    await signUp(other, createSoftwareAuthenticator(), "other@example.com");
    await other.post("setRecoveryEmail", { email: "owner@example.com" });

    const refused = await createAuthTestClient(makeHandlers()).post(
      "verifyEmail",
      { token: await lastLinkTo("owner@example.com"), locale: "en" },
    );

    expect(refused).toMatchObject({
      status: 409,
      body: { error: "email_registered" },
    });
    expect((await other.get("recoveryEmail")).body).toEqual({
      email: "owner@example.com",
      verified: false,
    });
    expect((await owner.get("recoveryEmail")).body).toEqual({
      email: "owner@example.com",
      verified: true,
    });
    expect((await sentAfterResponse()).map(({ to }) => to)).toEqual([
      "owner@example.com",
    ]);
  });

  it("refuses a confirmation link after 1 hour", async () => {
    const { client } = await signedInOwner();
    await client.post("setRecoveryEmail", { email: "qingqi@example.com" });
    const token = verificationTokenIn((await readOutbox(outboxDir))[0]?.text);
    advance(61 * 60 * 1000);

    expect(await confirmRecoveryEmail(token)).toBe(false);
  });

  it("refuses an address that is not an email, a visitor with no session, and a server with no email", async () => {
    const { client } = await signedInOwner();

    const notEmail = await client.post("setRecoveryEmail", {
      email: "qingqi",
    });
    const signedOut = await createAuthTestClient(makeHandlers()).post(
      "setRecoveryEmail",
      { email: "qingqi@example.com" },
    );
    const noEmail = await createAuthTestClient(
      makeHandlers({ emailSender: () => null }),
    ).post("requestRecovery", { email: "qingqi@example.com" });

    expect(notEmail).toMatchObject({
      status: 400,
      body: { error: "email_invalid" },
    });
    expect(signedOut.status).toBe(401);
    expect(noEmail).toMatchObject({
      status: 503,
      body: { error: "email_not_configured" },
    });
  });
});

describe("recovery by email", () => {
  async function ownerWithEmail(email: string, { verified = true } = {}) {
    const lostDevice = createAuthTestClient(makeHandlers());
    const lostPhone = createSoftwareAuthenticator();
    const result = await signUp(lostDevice, lostPhone);
    const session = await lostDevice.get<{ userId: string }>("session");
    await db
      .update(users)
      .set({ email, emailVerifiedAt: verified ? now : null })
      .where(eq(users.id, session.body.userId));
    return { lostDevice, lostPhone, result, userId: session.body.userId };
  }

  async function requestRecovery(
    email: string,
    handlers = makeHandlers(),
    client = createAuthTestClient(handlers),
  ) {
    const response = await client.post("requestRecovery", {
      email,
      locale: "en",
    });
    await Promise.all(afterTasks.splice(0));
    return response;
  }

  /** Asks for recovery in a new browser and returns it with the code that the email gave. */
  async function browserWithCode(email: string) {
    const browser = createAuthTestClient(makeHandlers());
    const before = (await readOutbox(outboxDir)).length;
    await requestRecovery(email, undefined, browser);
    const sent = (await readOutbox(outboxDir)).at(before);
    return { browser, code: sent ? codeIn(sent.text) : "000000", sent };
  }

  function enterCode(browser: Client, code: string) {
    return browser.post<{ path?: string }>("recoveryCode", { code });
  }

  it("answers the same for an address that no user has, and sends to no one", async () => {
    await ownerWithEmail("qingqi@example.com");

    const known = await requestRecovery("Qingqi@example.com");
    const unknown = await requestRecovery("nobody@example.com");

    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
    expect(cookieShapes(unknown.setCookies)).toEqual(
      cookieShapes(known.setCookies),
    );
    const sent = await readOutbox(outboxDir);
    expect(sent.map((email) => email.to)).toEqual(["qingqi@example.com"]);
  });

  it("sends nothing to an email that is not confirmed", async () => {
    await ownerWithEmail("qingqi@example.com", { verified: false });

    expect((await requestRecovery("qingqi@example.com")).status).toBe(202);

    expect(await readOutbox(outboxDir)).toEqual([]);
  });

  it("replaces the lost passkeys and signs out every other device", async () => {
    const { lostDevice, lostPhone, result, userId } =
      await ownerWithEmail("qingqi@example.com");

    await requestRecovery("qingqi@example.com");
    const [sent] = await readOutbox(outboxDir);
    const link = recoveryTokenIn(sent.text);

    const newPhone = createSoftwareAuthenticator();
    const newDevice = createAuthTestClient(makeHandlers());
    const recovered = await acceptInvite(newDevice, newPhone, link);

    expect(recovered).toMatchObject({ status: 200, body: result.body });
    expect((await newDevice.get("session")).body).toMatchObject({ userId });
    expect((await lostDevice.get("session")).status).toBe(401);
    expect(
      (await signIn(createAuthTestClient(makeHandlers()), lostPhone)).status,
    ).toBe(401);
    expect(
      (await signIn(createAuthTestClient(makeHandlers()), newPhone)).status,
    ).toBe(200);
    expect(
      (
        await acceptInvite(
          createAuthTestClient(makeHandlers()),
          createSoftwareAuthenticator(),
          link,
        )
      ).status,
    ).toBe(410);
  });

  it("refuses a recovery link after 30 minutes", async () => {
    await ownerWithEmail("qingqi@example.com");
    await requestRecovery("qingqi@example.com");
    const token = recoveryTokenIn((await readOutbox(outboxDir))[0]?.text);
    advance(31 * 60 * 1000);

    const result = await acceptInvite(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      token,
    );

    expect(result.status).toBe(410);
  });

  it("sends nothing for a removed member", async () => {
    const { result } = await ownerWithEmail("qingqi@example.com");
    await db
      .update(members)
      .set({ deletedAt: now })
      .where(eq(members.id, result.body.memberId));

    expect((await requestRecovery("qingqi@example.com")).status).toBe(202);

    expect(await readOutbox(outboxDir)).toEqual([]);
  });

  it("gets back in with the emailed code in the browser that asked, and the emailed link still works", async () => {
    const { lostDevice, result, userId } =
      await ownerWithEmail("qingqi@example.com");
    const { browser, code, sent } = await browserWithCode("qingqi@example.com");
    expect(sent?.subject).toBe(`${code} is your Finance recovery code`);

    const entered = await enterCode(
      browser,
      ` ${code.slice(0, 3)} ${code.slice(3)} `,
    );

    expect(entered.status).toBe(200);
    const token = recoveryTokenIn(entered.body.path);
    const newPhone = createSoftwareAuthenticator();
    const recovered = await acceptInvite(browser, newPhone, token);
    expect(recovered).toMatchObject({ status: 200, body: result.body });
    expect((await browser.get("session")).body).toMatchObject({ userId });
    expect((await lostDevice.get("session")).status).toBe(401);
    expect((await enterCode(browser, code)).status).toBe(410);

    const emailed = recoveryTokenIn(sent?.text);
    const emailedLink = await createAuthTestClient(makeHandlers()).post(
      "inviteOptions",
      { token: emailed },
    );
    expect(emailedLink.status).toBe(200);
  });

  itChecksEmailCodes(async () => {
    await ownerWithEmail("qingqi@example.com");
    return () => browserWithCode("qingqi@example.com");
  }, enterCode);

  it("answers a code for an address that no user has as it answers a wrong code", async () => {
    await ownerWithEmail("qingqi@example.com");
    const known = await browserWithCode("qingqi@example.com");
    const unknown = await browserWithCode("nobody@example.com");
    expect(unknown.sent).toBeUndefined();

    const answers = [];
    for (const { browser, code } of [known, unknown]) {
      const response = await enterCode(browser, otherCode(code));
      answers.push({
        status: response.status,
        body: response.body,
        cookies: cookieShapes(response.setCookies),
      });
    }

    expect(answers[1]).toEqual(answers[0]);
  });

  it("limits requests by address and by IP", async () => {
    const counted: string[] = [];
    const handlers = makeHandlers({
      limitRequest: (bucket, identifier) => {
        counted.push(`${bucket} ${identifier}`);
        return Promise.resolve({
          success: bucket !== "recovery-email-address",
          reset: now.getTime() + 1000,
        });
      },
    });
    await ownerWithEmail("qingqi@example.com");

    const result = await requestRecovery("qingqi@example.com", handlers);

    expect(result).toMatchObject({
      status: 429,
      body: { error: "rate_limited" },
    });
    expect(counted).toEqual([
      expect.stringMatching(/^auth /),
      expect.stringMatching(/^recovery-email-ip /),
      expect.stringMatching(/^recovery-email-address [0-9a-f]{64}$/),
    ]);
    expect(await readOutbox(outboxDir)).toEqual([]);
  });
});

describe("sign-in and sessions", () => {
  async function signedUpAuthenticator() {
    const authenticator = createSoftwareAuthenticator();
    await signUp(createAuthTestClient(makeHandlers()), authenticator);
    return authenticator;
  }

  function sessionRequest(client: Client) {
    return new Request(`${TEST_ORIGIN}/api/finance/sync`, {
      headers: {
        Cookie: `${financeSessionCookie.name}=${client.jar.get(financeSessionCookie.name) ?? ""}`,
      },
    });
  }

  function makeSessionReader() {
    const reissued: string[] = [];
    const getFinanceSession = makeGetFinanceSession({
      getDb: () => db,
      now: () => now,
      reissueCookie: (token) => {
        reissued.push(token);
        return Promise.resolve();
      },
    });
    return { getFinanceSession, reissued };
  }

  it("signs in with a discoverable passkey and resolves the session", async () => {
    const authenticator = await signedUpAuthenticator();
    const client = createAuthTestClient(makeHandlers());

    const result = await signIn(client, authenticator);

    expect(result.status).toBe(200);
    const { getFinanceSession } = makeSessionReader();
    const session = await getFinanceSession(sessionRequest(client));
    const owner = (await db.select().from(members)).at(0);
    expect(session).toMatchObject({
      userId: owner?.userId,
      householdId: owner?.householdId,
      memberId: owner?.id,
      role: "owner",
    });
    const passkey = (await db.select().from(passkeys)).at(0);
    expect(passkey?.counter).toBe(1);
    expect(passkey?.lastUsedAt).toEqual(now);
  });

  it("rejects a replayed assertion", async () => {
    const authenticator = await signedUpAuthenticator();
    const client = createAuthTestClient(makeHandlers());
    const options = await client.post<{
      options: PublicKeyCredentialRequestOptionsJSON;
    }>("signInOptions");
    const response = await authenticator.authenticate(
      options.body.options,
      TEST_ORIGIN,
    );
    expect((await client.post("signInVerify", { response })).status).toBe(200);

    const replay = await client.post("signInVerify", { response });

    expect(replay).toMatchObject({
      status: 400,
      body: { error: "challenge_invalid" },
    });
  });

  it("rejects an assertion for another origin", async () => {
    const authenticator = await signedUpAuthenticator();
    const client = createAuthTestClient(makeHandlers());
    const options = await client.post<{
      options: PublicKeyCredentialRequestOptionsJSON;
    }>("signInOptions");
    const response = await authenticator.authenticate(
      options.body.options,
      "https://evil.example",
    );

    const result = await client.post("signInVerify", { response });

    expect(result.status).toBe(401);
    expect(client.jar.has(financeSessionCookie.name)).toBe(false);
  });

  it("renews the session after 7 days and writes last-seen at most hourly", async () => {
    const authenticator = await signedUpAuthenticator();
    const client = createAuthTestClient(makeHandlers());
    await signIn(client, authenticator);
    const { getFinanceSession, reissued } = makeSessionReader();
    const signedInAt = now;
    const tokenHash = hashToken(
      client.jar.get(financeSessionCookie.name) ?? "",
    );
    const readRow = async () =>
      (
        await db
          .select()
          .from(sessions)
          .where(eq(sessions.tokenHash, tokenHash))
      ).at(0);

    advance(30 * 60 * 1000);
    await getFinanceSession(sessionRequest(client));
    expect((await readRow())?.lastSeenAt).toEqual(signedInAt);

    advance(60 * 60 * 1000);
    await getFinanceSession(sessionRequest(client));
    expect((await readRow())?.lastSeenAt).toEqual(now);
    expect(reissued).toHaveLength(0);

    advance(7 * DAY_MS);
    expect(await getFinanceSession(sessionRequest(client))).not.toBeNull();
    expect(reissued).toEqual([client.jar.get(financeSessionCookie.name)]);
    expect(await readRow()).toMatchObject({
      refreshedAt: now,
      expiresAt: new Date(now.getTime() + 400 * DAY_MS),
    });

    advance(DAY_MS);
    await getFinanceSession(sessionRequest(client));
    expect(reissued).toHaveLength(1);
  });

  it("forgets a session after 400 days without renewal", async () => {
    const authenticator = await signedUpAuthenticator();
    const client = createAuthTestClient(makeHandlers());
    await signIn(client, authenticator);
    const { getFinanceSession } = makeSessionReader();

    advance(401 * DAY_MS);

    expect(await getFinanceSession(sessionRequest(client))).toBeNull();
    expect(await db.select().from(sessions)).toHaveLength(1);
  });

  it("signs out by deleting the session", async () => {
    const authenticator = await signedUpAuthenticator();
    const client = createAuthTestClient(makeHandlers());
    await signIn(client, authenticator);
    const request = sessionRequest(client);

    const result = await client.post("signOut");

    expect(result.status).toBe(200);
    expect(client.jar.has(financeSessionCookie.name)).toBe(false);
    expect(await db.select().from(sessions)).toHaveLength(1);
    expect(await makeSessionReader().getFinanceSession(request)).toBeNull();
    expect((await client.get("session")).status).toBe(401);
  });
});

describe("invites", () => {
  async function ownerAndInvite() {
    const { imported, owner } = await claimedHousehold();
    const invite = await owner.post<{ token: string; path: string }>(
      "createInvite",
      { memberId: imported.memberIds[1] },
    );
    return { imported, owner, invite };
  }

  it("binds a new user to the invited member, starts a session, and sends a confirmation to the user's email", async () => {
    const { imported, invite } = await ownerAndInvite();
    expect(invite.status).toBe(201);
    expect(invite.body.path).toBe(`/finance/invite/${invite.body.token}`);

    const partner = createAuthTestClient(makeHandlers());
    const options = await partner.post<RegistrationOptionsBody>(
      "inviteOptions",
      { token: invite.body.token, email: "Partner@Example.com" },
    );
    expect(options.body).toMatchObject({
      householdName: "Home",
      memberName: "Partner",
    });
    const response = await createSoftwareAuthenticator().register(
      options.body.options,
      TEST_ORIGIN,
    );
    const result = await partner.post("inviteVerify", {
      token: invite.body.token,
      response,
      email: "Partner@Example.com",
      locale: "zh",
    });
    await Promise.all(afterTasks.splice(0));

    expect(result.status).toBe(200);
    const session = await partner.get<{ userId: string }>("session");
    expect(session.body).toMatchObject({
      householdId: imported.householdId,
      memberId: imported.memberIds[1],
      role: "member",
    });
    const used = (
      await db
        .select()
        .from(invites)
        .where(eq(invites.memberId, imported.memberIds[1] ?? ""))
    ).at(0);
    expect(used?.usedAt).toEqual(now);
    expect((await partner.get("recoveryEmail")).body).toEqual({
      email: "partner@example.com",
      verified: false,
    });
    const [sent] = await readOutbox(outboxDir);
    expect(sent).toMatchObject({
      to: "partner@example.com",
      subject: "确认家庭账本恢复邮箱",
    });
    expect(
      await confirmRecoveryEmail(verificationTokenIn(sent.text, "/zh")),
    ).toBe(true);
  });

  it("rejects a used invite", async () => {
    const { invite } = await ownerAndInvite();
    await acceptInvite(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      invite.body.token,
    );

    const again = await acceptInvite(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      invite.body.token,
    );

    expect(again).toMatchObject({
      status: 410,
      body: { error: "invite_invalid" },
    });
  });

  it("rejects an expired invite", async () => {
    const { invite } = await ownerAndInvite();

    advance(7 * DAY_MS + 1);
    const result = await acceptInvite(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      invite.body.token,
    );

    expect(result.status).toBe(410);
  });

  it("revokes an earlier invite when a new one is made", async () => {
    const { imported, owner, invite } = await ownerAndInvite();
    await owner.post("createInvite", { memberId: imported.memberIds[1] });

    const result = await acceptInvite(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      invite.body.token,
    );

    expect(result.status).toBe(410);
  });

  it("only invites unclaimed members of the session's household", async () => {
    const { imported, owner } = await ownerAndInvite();
    const other = await createTestHousehold(db, {
      name: "Other",
      members: [{ name: "Stranger", role: "owner" }],
    });

    const claimed = await owner.post("createInvite", {
      memberId: imported.memberIds[0],
    });
    const foreign = await owner.post("createInvite", {
      memberId: other.memberIds[0],
    });
    const anonymous = await createAuthTestClient(makeHandlers()).post(
      "createInvite",
      { memberId: imported.memberIds[1] },
    );

    expect(claimed.status).toBe(409);
    expect(foreign.status).toBe(404);
    expect(anonymous.status).toBe(401);
  });
});

describe("recovery invites", () => {
  async function ownerAndPartner() {
    const { imported, owner } = await claimedHousehold();
    const invite = await owner.post<{ token: string }>("createInvite", {
      memberId: imported.memberIds[1],
    });
    const lostPhone = createSoftwareAuthenticator();
    const partner = createAuthTestClient(makeHandlers());
    await acceptInvite(partner, lostPhone, invite.body.token);
    return { imported, owner, partner, lostPhone };
  }

  it("lets the owner re-invite a member who lost every passkey", async () => {
    const { imported, owner, lostPhone } = await ownerAndPartner();
    const partnerMember = (
      await db
        .select()
        .from(members)
        .where(eq(members.id, imported.memberIds[1]))
    ).at(0);

    const recovery = await owner.post<{ token: string; recovery: boolean }>(
      "createInvite",
      { memberId: imported.memberIds[1] },
    );
    expect(recovery).toMatchObject({ status: 201, body: { recovery: true } });

    const newPhone = createSoftwareAuthenticator();
    const newDevice = createAuthTestClient(makeHandlers());
    const result = await acceptInvite(newDevice, newPhone, recovery.body.token);

    expect(result).toMatchObject({
      status: 200,
      body: { memberId: imported.memberIds[1] },
    });
    const session = await newDevice.get<{ userId: string; memberId: string }>(
      "session",
    );
    expect(session.body).toMatchObject({
      userId: partnerMember?.userId,
      memberId: imported.memberIds[1],
    });
    const stored = await db
      .select({ id: passkeys.id })
      .from(passkeys)
      .where(eq(passkeys.userId, partnerMember?.userId ?? ""));
    expect(stored).toEqual([{ id: newPhone.credentials[0]?.id }]);
    expect(
      (await signIn(createAuthTestClient(makeHandlers()), lostPhone)).status,
    ).toBe(401);
    expect(
      (await signIn(createAuthTestClient(makeHandlers()), newPhone)).status,
    ).toBe(200);
  });

  it("ends the lost device's sessions", async () => {
    const { imported, owner, partner } = await ownerAndPartner();
    const recovery = await owner.post<{ token: string }>("createInvite", {
      memberId: imported.memberIds[1],
    });

    await acceptInvite(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      recovery.body.token,
    );

    expect((await partner.get("session")).status).toBe(401);
  });

  it("is for the owner only", async () => {
    const { imported, partner } = await ownerAndPartner();

    const result = await partner.post("createInvite", {
      memberId: imported.memberIds[0],
    });

    expect(result).toMatchObject({
      status: 403,
      body: { error: "owner_only" },
    });
  });

  it("refuses a recovery invite once its member has another user", async () => {
    const { imported, owner } = await ownerAndPartner();
    const recovery = await owner.post<{ token: string }>("createInvite", {
      memberId: imported.memberIds[1],
    });
    await db
      .update(members)
      .set({ userId: null })
      .where(eq(members.id, imported.memberIds[1]));

    const result = await acceptInvite(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      recovery.body.token,
    );

    expect(result.status).toBe(410);
  });
});

describe("add a passkey", () => {
  it("registers a second passkey that can sign in", async () => {
    const first = createSoftwareAuthenticator();
    const client = createAuthTestClient(makeHandlers());
    await signUp(client, first);

    const options =
      await client.post<RegistrationOptionsBody>("passkeyOptions");
    expect(options.body.options.excludeCredentials).toEqual([
      expect.objectContaining({ id: first.credentials[0]?.id }),
    ]);
    const second = createSoftwareAuthenticator();
    const response = await second.register(options.body.options, TEST_ORIGIN);
    const result = await client.post("passkeyVerify", { response });

    expect(result.status).toBe(200);
    expect(await db.select().from(passkeys)).toHaveLength(2);
    const fresh = createAuthTestClient(makeHandlers());
    expect((await signIn(fresh, second)).status).toBe(200);
  });
});

describe("request guards", () => {
  it("rejects a cross-origin or origin-less POST", async () => {
    const client = createAuthTestClient(makeHandlers());

    const crossOrigin = await client.post(
      "signInOptions",
      {},
      "https://evil.example",
    );
    const noOrigin = await client.post("signInOptions", {}, null);

    expect(crossOrigin).toMatchObject({
      status: 403,
      body: { error: "forbidden_origin" },
    });
    expect(noOrigin.status).toBe(403);
  });

  it("rejects a request over the rate limit", async () => {
    const client = createAuthTestClient(
      makeHandlers({
        limitRequest: () =>
          Promise.resolve({ success: false, reset: now.getTime() + 1000 }),
      }),
    );

    const result = await client.post("signInOptions");

    expect(result.status).toBe(429);
    expect(result.headers.get("Retry-After")).toBe("1");
  });
});

describe("demo", () => {
  async function demoHousehold() {
    const userId = randomUUID();
    await db.insert(users).values({ id: userId, displayName: "Alex" });
    const demo = await createTestHousehold(db, {
      name: "Home",
      members: [
        { name: "Alex", role: "owner", userId },
        { name: "Sam", role: "member" },
      ],
    });
    await withHousehold(db, demo.householdId, (scope) =>
      scope.db.update(households).set({ demo: true }),
    );
    return demo;
  }

  function guard(client: Client, write: boolean) {
    const token = client.jar.get(financeSessionCookie.name) ?? "";
    const request = new Request(`${TEST_ORIGIN}/api/finance/sync`, {
      method: write ? "POST" : "GET",
      headers: {
        Cookie: `${financeSessionCookie.name}=${token}`,
        Origin: TEST_ORIGIN,
      },
    });
    return guardFinanceRequest(
      {
        isConfigured: () => true,
        getSession: makeGetFinanceSession({
          getDb: () => db,
          now: () => now,
          reissueCookie: () => Promise.resolve(),
        }),
      },
      request,
      { write },
    );
  }

  it("is not found until a Household is the demo", async () => {
    await importedHousehold();
    const result = await createAuthTestClient(makeHandlers()).post("startDemo");

    expect(result).toMatchObject({
      status: 404,
      body: { error: "demo_not_found" },
    });
  });

  it("lets a visitor read the demo as its owner, and refuses every write", async () => {
    const demo = await demoHousehold();
    const visitor = createAuthTestClient(makeHandlers());

    expect((await visitor.post("startDemo")).status).toBe(200);
    expect(await visitor.get("session")).toMatchObject({
      status: 200,
      body: { householdId: demo.householdId, role: "owner" },
    });
    expect(await guard(visitor, false)).toMatchObject({
      householdId: demo.householdId,
      readOnly: true,
    });

    expect(await guard(visitor, true)).toMatchObject({ status: 403 });
    expect(
      await visitor.post("createInvite", { memberId: demo.memberIds[1] }),
    ).toMatchObject({ status: 403, body: { error: "read_only" } });
    expect(await visitor.post("passkeyOptions")).toMatchObject({
      status: 403,
      body: { error: "read_only" },
    });
    expect(
      await visitor.post("setRecoveryEmail", { email: "demo@example.com" }),
    ).toMatchObject({ status: 403, body: { error: "read_only" } });
    expect((await visitor.post("signOut")).status).toBe(200);
  });

  it("signs a visitor in for one day without renewal, and a later visitor clears the expired session", async () => {
    await demoHousehold();
    const first = createAuthTestClient(makeHandlers());

    const started = await first.post("startDemo");

    expect(started.setCookies.join("\n")).toMatch(
      /finance_session=[^;]+; Max-Age=86400;/,
    );
    advance(DAY_MS - 60 * 1000);
    expect(await guard(first, false)).toMatchObject({ readOnly: true });

    advance(2 * 60 * 1000);
    await createAuthTestClient(makeHandlers()).post("startDemo");

    expect(await db.select().from(sessions)).toHaveLength(1);
    expect(await guard(first, false)).toMatchObject({ status: 401 });
  });
});
