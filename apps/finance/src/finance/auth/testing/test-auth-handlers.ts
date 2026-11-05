import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { afterEach, beforeEach, expect, it } from "vitest";
import {
  createTestDb,
  type TestDb,
} from "#src/finance/db/testing/create-test-db.ts";
import { createTestHousehold } from "#src/finance/db/testing/create-test-household.ts";
import { withHousehold } from "#src/finance/db/with-household.ts";
import {
  makeOutboxEmailSender,
  readOutbox,
} from "../../email/make-outbox-email-sender.ts";
import { createInvite } from "../create-invite.ts";
import { isAllowedFinanceOrigin } from "../is-allowed-finance-origin.ts";
import {
  makeAuthHandlers,
  type AuthHandlerDeps,
} from "../make-auth-handlers.ts";
import {
  createAuthTestClient,
  TEST_ORIGIN,
} from "./create-auth-test-client.ts";
import { createSoftwareAuthenticator } from "./create-software-authenticator.ts";

export const DAY_MS = 24 * 60 * 60 * 1000;

type Authenticator = ReturnType<typeof createSoftwareAuthenticator>;
export type Client = ReturnType<typeof createAuthTestClient>;
export interface RegistrationOptionsBody {
  options: PublicKeyCredentialCreationOptionsJSON;
  email?: string;
  memberName?: string;
  householdName?: string;
}
interface SignedInBody {
  householdId: string;
  memberId: string;
}

export let db: TestDb;
export let now: Date;
export let outboxDir: string;
export let afterTasks: Promise<void>[];

export function makeHandlers(overrides: Partial<AuthHandlerDeps> = {}) {
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

export function verificationTokenIn(text = "", localePrefix = ""): string {
  const match = new RegExp(
    `${TEST_ORIGIN}${localePrefix}/verify-email/([\\w-]+)`,
  ).exec(text);
  if (!match?.[1]) throw new Error(`No confirmation link in: ${text}`);
  return match[1];
}

export function codeIn(text = ""): string {
  const match = /^(\d{6})$/m.exec(text);
  if (!match?.[1]) throw new Error(`No code in: ${text}`);
  return match[1];
}

export function otherCode(code: string): string {
  return String((Number(code) + 1) % 1_000_000).padStart(6, "0");
}

/** Declares the checks of an emailed code that sign-up and recovery share. */
export function itChecksEmailCodes(
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
export function cookieShapes(setCookies: string[]): string[] {
  return setCookies.map((cookie) => cookie.replace(/=[^;]*;/, "=;"));
}

export function signUpTokenIn(text = ""): string {
  const match = /\/sign-up\/([\w-]+)/.exec(text);
  if (!match?.[1]) throw new Error(`No sign-up link in: ${text}`);
  return match[1];
}

export function recoveryTokenIn(text = ""): string {
  const tokens = [...text.matchAll(/\/invite\/([\w-]+)/g)];
  if (tokens.length !== 1 || !tokens[0]?.[1]) {
    throw new Error(`Not one Recovery link in: ${text}`);
  }
  return tokens[0][1];
}

/** Opens the confirmation link with no session, as on another device. */
export async function confirmRecoveryEmail(
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

export function advance(ms: number) {
  now = new Date(now.getTime() + ms);
}

/** Asks for a sign-up link for `email` and returns its token. The outbox is empty again after it. */
export async function requestSignUpToken(email = "owner@example.com") {
  const requested = await createAuthTestClient(makeHandlers()).post(
    "requestSignUp",
    { email, locale: "en" },
  );
  expect(requested.status).toBe(202);
  const sent = await readOutbox(outboxDir);
  await rm(outboxDir, { recursive: true, force: true });
  return signUpTokenIn(sent.at(-1)?.text);
}

export async function finishSignUp(
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
export async function signUp(
  client: Client,
  authenticator: Authenticator,
  email = "owner@example.com",
) {
  return finishSignUp(client, authenticator, await requestSignUpToken(email));
}

export async function signIn(client: Client, authenticator: Authenticator) {
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

export async function acceptInvite(
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
export async function importedHousehold() {
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
export async function claimedHousehold() {
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

export function setUpAuthHandlerTests() {
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
}
