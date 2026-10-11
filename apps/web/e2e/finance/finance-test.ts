import { randomInt, randomUUID } from "node:crypto";
import {
  test as base,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";
import { bindNewUserToMember } from "../../src/finance/auth/bind-new-user-to-member.ts";
import { createInvite } from "../../src/finance/auth/create-invite.ts";
import { schema, users } from "../../src/finance/db/schema.ts";
import type { FinanceDb } from "../../src/finance/db/types.ts";
import {
  seedSyntheticHousehold,
  type SyntheticHousehold,
} from "../../src/finance/dev/seed/seed-synthetic-household.ts";
import { FINANCE_E2E_SETUP_SECRET, financeE2eEnv } from "./finance-e2e-env.ts";

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
  /** A user with no Member, who creates the invites that sign the tests in. */
  inviterId: string;
}

interface TestFixtures {
  /** A CDP virtual authenticator on `page`, so passkey ceremonies complete without a person. */
  passkeys: string;
  /** A new synthetic Household. Its owner has a user but no passkey, so sign-in setup cannot claim it. */
  household: SyntheticHousehold;
  /** A new synthetic Household that nobody has claimed yet, for the setup claim flow. */
  unclaimedHousehold: SyntheticHousehold;
  /** The test's page, signed in as the owner of `household` through a recovery invite. */
  session: FinanceSession;
}

/**
 * A seeded Household is small so that seeding does not hold the one
 * PGlite session for long while other workers run.
 */
const SEED_OPTIONS = { years: 1, transactionsPerYear: 400 };

/** Setup with the e2e secret tells a server with the e2e Finance settings from another server, without a write. */
async function probeFinance(
  api: APIRequestContext,
  baseURL: string,
): Promise<string | null> {
  const response = await api.post("/api/finance/auth/setup/options", {
    headers: { Origin: baseURL, Referer: `${baseURL}/finance/sign-in` },
    data: { setupSecret: FINANCE_E2E_SETUP_SECRET },
  });
  if (response.ok()) return null;
  const body = await response.text();
  if (response.status() === 403 && body.includes("setup_closed")) return null;
  return `The server at ${baseURL} does not run Finance with the e2e database (setup answered ${String(response.status())} ${body}). Playwright reused a server that was already up, such as \`pnpm dev\`, which uses its own database. Stop that server so that Playwright starts one with the e2e Finance settings.`;
}

function seedHousehold(db: FinanceDb) {
  return seedSyntheticHousehold(db, {
    ...SEED_OPTIONS,
    seed: randomInt(1, 2 ** 31 - 1),
  });
}

/**
 * Seeds a Household and gives its owner a user in one transaction. Sign-in
 * setup claims the oldest unclaimed owner, so a Household that other
 * workers can see unclaimed could go to the wrong test.
 */
function seedClaimedHousehold(db: FinanceDb) {
  return db.transaction(async (tx) => {
    const household = await seedHousehold(tx);
    await bindNewUserToMember(tx, {
      householdId: household.householdId,
      memberId: household.memberIds.alex,
      displayName: "Alex",
    });
    return household;
  });
}

/** Claims the oldest unclaimed owner with a new passkey, then waits for the page that `next` names. */
export async function claimWithPasskey(page: Page, next: string) {
  await page.goto(`/finance/sign-in?next=${encodeURIComponent(next)}`);
  await page
    .getByRole("textbox", { name: "Setup secret" })
    .fill(FINANCE_E2E_SETUP_SECRET);
  await page.getByRole("button", { name: "Create a passkey" }).click();
  await page.waitForURL((url) => url.pathname === next.split("?")[0]);
}

/** Adds a CDP virtual authenticator to `page`, so passkey ceremonies complete without a person. */
export async function addVirtualAuthenticator(page: Page): Promise<string> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
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

export async function expectNoSidewaysScroll(page: Page) {
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
    async ({ playwright }, provide, workerInfo) => {
      const { baseURL } = workerInfo.project.use;
      if (baseURL === undefined) throw new Error("No baseURL is set.");
      const api = await playwright.request.newContext({ baseURL });
      const reason = await probeFinance(api, baseURL);
      await api.dispose();
      if (reason !== null) throw new Error(reason);
      await provide(undefined);
    },
    { scope: "worker", auto: true },
  ],

  financeDb: [
    // eslint-disable-next-line no-empty-pattern -- Playwright reads the fixtures that a fixture needs from this pattern, so the pattern must stay when it is empty.
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

  inviterId: [
    async ({ financeDb }, provide) => {
      const id = randomUUID();
      await financeDb.insert(users).values({ id, displayName: "E2E inviter" });
      await provide(id);
    },
    { scope: "worker" },
  ],

  passkeys: async ({ page }, provide) => {
    await provide(await addVirtualAuthenticator(page));
  },

  household: async ({ financeDb }, provide) => {
    await provide(await seedClaimedHousehold(financeDb));
  },

  unclaimedHousehold: async ({ financeDb }, provide) => {
    await provide(await seedHousehold(financeDb));
  },

  session: async (
    { page, passkeys: _passkeys, household, financeDb, inviterId },
    provide,
  ) => {
    const invite = await createInvite(financeDb, {
      householdId: household.householdId,
      memberId: household.memberIds.alex,
      createdBy: inviterId,
      allowRecovery: true,
      now: new Date(),
    });
    if (!invite.ok) throw new Error(`No invite: ${invite.reason}`);
    await page.goto(`/finance/invite/${invite.token}`);
    await page.getByRole("button", { name: "Save a new passkey" }).click();
    await page.waitForURL((url) => url.pathname === "/finance");
    await page.goto("/finance/transactions");
    const session = await readSession(page);
    expect(session.householdId).toBe(household.householdId);
    await provide(session);
  },
});
