import { randomInt, randomUUID } from "node:crypto";
import {
  test as base,
  expect,
  type APIRequestContext,
  type CDPSession,
  type Locator,
  type Page,
} from "@playwright/test";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";
import { createInvite } from "../../src/finance/auth/create-invite.ts";
import { createSession } from "../../src/finance/auth/create-session.ts";
import { financeSessionCookie } from "../../src/finance/auth/finance-session-cookie.ts";
import { startSignUp } from "../../src/finance/auth/start-sign-up.ts";
import { schema } from "../../src/finance/db/schema.ts";
import type { FinanceDb } from "../../src/finance/db/types.ts";
import {
  asFinanceApp,
  withHousehold,
} from "../../src/finance/db/with-household.ts";
import {
  seedSyntheticHousehold,
  type SyntheticHousehold,
} from "../../src/finance/dev/seed/seed-synthetic-household.ts";
import { readOutbox } from "../../src/finance/email/make-outbox-email-sender.ts";
import type { FinanceEmail } from "../../src/finance/email/types.ts";
import { waitForMotionToSettle } from "../helpers/motion.ts";
import { FINANCE_E2E_EMAIL_OUTBOX, financeE2eEnv } from "./finance-e2e-env.ts";
import { SYNC_TIMEOUT } from "./transactions-page.ts";

export { expect };

const financeSessionSchema = z.object({
  userId: z.string(),
  householdId: z.string(),
  memberId: z.string(),
  role: z.string(),
});

export type FinanceSession = z.infer<typeof financeSessionSchema>;

interface WorkerFixtures {
  financeServer: undefined;
  financeDb: FinanceDb;
}

interface TestFixtures {
  /** A CDP virtual authenticator on `page`, so passkey ceremonies complete without a person. */
  passkeys: string;
  /** A new synthetic Household. Its owner has a user but no passkey yet. */
  household: SyntheticHousehold & { ownerUserId: string };
  /** The test's page, signed in as the owner of `household` through a recovery invite, which asks for no email. */
  session: FinanceSession;
  /** The test's page, signed in as the owner of `household` with a session cookie. Unlike `session`, it needs no passkey, so it works outside Chromium. */
  cookieSession: undefined;
}

/**
 * A seeded Household is small so that seeding does not hold the one
 * PGlite session for long while other workers run.
 */
const SEED_OPTIONS = { years: 1, transactionsPerYear: 400 };

/**
 * Locally Playwright reuses a dev server that is already up, and that server
 * does not have the e2e Finance settings. Only a server on the e2e database
 * knows a sign-up link that was written to that database.
 */
async function probeFinance(
  api: APIRequestContext,
  baseURL: string,
  db: FinanceDb,
): Promise<string | null> {
  const token = await asFinanceApp(db, (tx) =>
    startSignUp(tx, {
      email: `probe-${randomUUID()}@example.com`,
      now: new Date(),
    }),
  );
  const response = await api.post("/api/finance/auth/sign-up/options", {
    headers: { Origin: baseURL, Referer: `${baseURL}/finance/sign-in` },
    data: { token },
  });
  if (response.ok()) return null;
  return `The server at ${baseURL} does not run Finance with the e2e database (sign-up answered ${String(response.status())} ${await response.text()}). Playwright reused a server that was already up, such as \`pnpm dev\`, which uses its own database. Stop that server so that Playwright starts one with the e2e Finance settings.`;
}

function seedHousehold(db: FinanceDb, ownerUserId?: string) {
  return seedSyntheticHousehold(db, {
    ...SEED_OPTIONS,
    seed: randomInt(1, 2 ** 31 - 1),
    ownerUserId,
  });
}

/** Seeds a Household and gives its owner a user, so that a recovery invite can sign the test in. */
async function seedClaimedHousehold(db: FinanceDb) {
  const ownerUserId = randomUUID();
  return { ...(await seedHousehold(db, ownerUserId)), ownerUserId };
}

/**
 * Clicks, then waits for what the click does. A click before the page has
 * hydrated lands on inert markup, so the pair repeats until it settles.
 */
export async function clickUntil(
  target: Locator,
  settled: () => Promise<unknown>,
) {
  await expect(async () => {
    await target.click({ timeout: 2000 });
    await settled();
  }).toPass({ timeout: SYNC_TIMEOUT });
}

/** Signs in with a passkey of the page's authenticator, and waits for the home page. */
export async function signInWithPasskey(page: Page) {
  const isHome = (url: URL) => url.pathname === "/finance";
  await expect(async () => {
    if (!isHome(new URL(page.url()))) {
      await page
        .getByRole("button", { name: "Sign in with a passkey" })
        .click({ timeout: 2000 });
    }
    await page.waitForURL(isHome, { timeout: 5000 });
  }).toPass({ timeout: SYNC_TIMEOUT });
}

/** Waits for an email with `subject` that the server wrote for `to`, and returns the newest one. */
export async function emailTo(
  to: string,
  subject: string | RegExp,
): Promise<FinanceEmail> {
  let found: FinanceEmail | undefined;
  await expect
    .poll(
      async () => {
        found = (await readOutbox(FINANCE_E2E_EMAIL_OUTBOX)).findLast(
          (email) =>
            email.to === to &&
            (typeof subject === "string"
              ? email.subject === subject
              : subject.test(email.subject)),
        );
        return found !== undefined;
      },
      { timeout: SYNC_TIMEOUT },
    )
    .toBe(true);
  if (!found) throw new Error(`No email "${String(subject)}" to ${to}`);
  return found;
}

/** The first link in `email` whose path starts with `path`. */
export function linkIn(email: FinanceEmail, path: string): string {
  const match = new RegExp(`https?://\\S+${path}[\\w-]+`).exec(email.text);
  if (!match) throw new Error(`No ${path} link in: ${email.text}`);
  return match[0];
}

/** An address that no other test uses. */
export function uniqueEmail(name: string): string {
  return `${name}-${randomUUID()}@example.com`;
}

/**
 * Asks for a sign-up code on the sign-in page and types it. Creates the User
 * and their Household with a passkey from the page's authenticator, and
 * waits for the Household's home page.
 */
export async function signUpWithEmail(
  page: Page,
  { email, name = "Alex" }: { email: string; name?: string },
) {
  await page.goto("/finance/sign-in");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByRole("button", { name: "Email me a sign-up code" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: `We sent a code to ${email}` }),
  ).toBeVisible();
  const sent = await emailTo(email, /^\d{6} is your Finance sign-up code$/);
  await page
    .getByRole("textbox", { name: "Code" })
    .fill(sent.subject.slice(0, 6));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Sign up for Finance" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(1);
  await expect(page.getByText(/household/i)).toHaveCount(0);
  await page.getByRole("textbox", { name: /Your name/ }).fill(name);
  await page.getByRole("button", { name: "Save a passkey" }).click();
  await page.waitForURL((url) => url.pathname === "/finance");
}

/** Adds a virtual authenticator through `cdp`, which must have `WebAuthn.enable` sent. */
export async function addAuthenticator(cdp: CDPSession): Promise<string> {
  const { authenticatorId } = await cdp.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    },
  );
  return authenticatorId;
}

/** Adds a CDP virtual authenticator to `page`, so passkey ceremonies complete without a person. */
export async function addVirtualAuthenticator(page: Page): Promise<string> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  return addAuthenticator(cdp);
}

/** Signs `page` in as the owner of `household` through a recovery invite, with a new passkey of the page's authenticator. */
export async function signInWithRecoveryInvite(
  page: Page,
  financeDb: FinanceDb,
  household: SyntheticHousehold,
) {
  const invite = await withHousehold(
    financeDb,
    household.householdId,
    (scope) =>
      createInvite(scope, {
        memberId: household.memberIds.alex,
        createdBy: null,
        allowRecovery: true,
        now: new Date(),
      }),
  );
  if (!invite.ok) throw new Error(`No invite: ${invite.reason}`);
  await page.goto(`/finance/invite/${invite.token}`);
  await page.getByRole("button", { name: "Save a new passkey" }).click();
  await page.waitForURL((url) => url.pathname === "/finance");
}

/** Waits until the service worker controls the page, and skips the test on a dev server, which has no worker. */
export async function waitForServiceWorker(page: Page) {
  const hasWorker = await page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker.ready.then(() => true),
      new Promise<boolean>((resolve) => {
        setTimeout(() => {
          resolve(false);
        }, 10_000);
      }),
    ]),
  );
  base.skip(!hasWorker, "The service worker runs in a production build only.");
  await expect
    .poll(
      () => page.evaluate(() => navigator.serviceWorker.controller !== null),
      { timeout: SYNC_TIMEOUT },
    )
    .toBe(true);
}

export async function expectNoSidewaysScroll(page: Page) {
  // A page that slides in is wider than the screen until it lands.
  await waitForMotionToSettle(page);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
}

/** The proxy refuses an API call without a same-site Referer, and `page.request` sends none. */
export function getFinanceApi(page: Page, path: string) {
  return page.request.get(path, { headers: { Referer: page.url() } });
}

export async function readSession(page: Page): Promise<FinanceSession> {
  const response = await getFinanceApi(page, "/api/finance/auth/session");
  expect(response.status()).toBe(200);
  return financeSessionSchema.parse(await response.json());
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  financeServer: [
    async ({ playwright, financeDb }, provide, workerInfo) => {
      const { baseURL } = workerInfo.project.use;
      if (baseURL === undefined) throw new Error("No baseURL is set.");
      const api = await playwright.request.newContext({ baseURL });
      const reason = await probeFinance(api, baseURL, financeDb);
      await api.dispose();
      if (reason !== null) throw new Error(reason);
      await provide(undefined);
    },
    { scope: "worker", auto: true },
  ],

  financeDb: [
    async ({}, provide) => {
      const pool = new Pool({
        connectionString: financeE2eEnv.FINANCE_DATABASE_URL,
        max: 1,
      });
      await provide(drizzle({ client: pool, schema }));
      await pool.end();
    },
    { scope: "worker" },
  ],

  passkeys: async ({ page }, provide) => {
    await provide(await addVirtualAuthenticator(page));
  },

  household: async ({ financeDb }, provide) => {
    await provide(await seedClaimedHousehold(financeDb));
  },

  cookieSession: async ({ page, household, financeDb, baseURL }, provide) => {
    if (baseURL === undefined) throw new Error("No baseURL is set.");
    const token = await asFinanceApp(financeDb, (tx) =>
      createSession(tx, {
        userId: household.ownerUserId,
        userAgent: "e2e",
        now: new Date(),
      }),
    );
    await page.context().addCookies([
      {
        name: financeSessionCookie.name,
        value: token,
        url: baseURL,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await provide(undefined);
  },

  session: async (
    { page, passkeys: _passkeys, household, financeDb },
    provide,
  ) => {
    await signInWithRecoveryInvite(page, financeDb, household);
    await page.goto("/finance/transactions");
    const session = await readSession(page);
    expect(session.householdId).toBe(household.householdId);
    await provide(session);
  },
});
