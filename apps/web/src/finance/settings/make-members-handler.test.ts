import { randomUUID } from "node:crypto";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHousehold } from "../auth/create-household.ts";
import { financeSessionCookie } from "../auth/finance-session-cookie.ts";
import { makeGetFinanceSession } from "../auth/get-finance-session.ts";
import { isAllowedFinanceOrigin } from "../auth/is-allowed-finance-origin.ts";
import {
  makeAuthHandlers,
  type AuthHandlers,
} from "../auth/make-auth-handlers.ts";
import {
  createAuthTestClient,
  TEST_ORIGIN,
} from "../auth/testing/create-auth-test-client.ts";
import { createSoftwareAuthenticator } from "../auth/testing/create-software-authenticator.ts";
import type { FinanceSession } from "../auth/types.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import { members, passkeys, sessions } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { seedTestHousehold } from "../db/testing/seed-test-household.ts";
import { pullChanges } from "../sync/pull-changes.ts";
import { makeMembersHandler } from "./make-members-handler.ts";

const SETUP_SECRET = "correct horse battery staple";
const DB_HOOK_TIMEOUT = 60_000;

type Client = ReturnType<typeof createAuthTestClient>;
type Authenticator = ReturnType<typeof createSoftwareAuthenticator>;

let db: TestDb;
let now: Date;

beforeEach(async () => {
  db = await createTestDb();
  now = new Date("2026-10-10T12:00:00Z");
}, DB_HOOK_TIMEOUT);

afterEach(async () => {
  await db.close();
}, DB_HOOK_TIMEOUT);

function authHandlers() {
  return makeAuthHandlers({
    getDb: () => db,
    now: () => now,
    authSecret: () => "test-auth-secret",
    setupSecret: () => SETUP_SECRET,
    limitRequest: () => Promise.resolve({ success: true, reset: 0 }),
    isAllowedOrigin: isAllowedFinanceOrigin,
  });
}

const readSession = makeGetFinanceSession({
  getDb: () => db,
  now: () => now,
  reissueCookie: () => Promise.resolve(),
});

/** Sends the PATCH as the browser of `client`, or with a fixed session. */
function patchMember(
  as: Client | FinanceSession,
  body: { id: string; removed: boolean },
) {
  const handler = makeMembersHandler({
    isConfigured: () => true,
    getDb: () => db,
    getSession: (request) =>
      "jar" in as ? readSession(request) : Promise.resolve(as),
    now: () => now,
  });
  const cookie =
    "jar" in as
      ? `${financeSessionCookie.name}=${as.jar.get(financeSessionCookie.name) ?? ""}`
      : "";
  return handler(
    new Request(`${TEST_ORIGIN}/api/finance/household/members`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Origin: TEST_ORIGIN,
        Cookie: cookie,
      },
      body: JSON.stringify(body),
    }),
  );
}

const ceremonies = {
  setup: { options: "setupOptions", verify: "setupVerify" },
  invite: { options: "inviteOptions", verify: "inviteVerify" },
} satisfies Record<
  string,
  { options: keyof AuthHandlers; verify: keyof AuthHandlers }
>;

async function register(
  client: Client,
  ceremony: keyof typeof ceremonies,
  body: object,
) {
  const { options: optionsHandler, verify } = ceremonies[ceremony];
  const options = await client.post<{
    options: PublicKeyCredentialCreationOptionsJSON;
  }>(optionsHandler, body);
  const authenticator = createSoftwareAuthenticator();
  const response = await authenticator.register(
    options.body.options,
    TEST_ORIGIN,
  );
  const result = await client.post(verify, {
    ...body,
    response,
  });
  return { authenticator, status: result.status };
}

async function signIn(authenticator: Authenticator) {
  const client = createAuthTestClient(authHandlers());
  const options = await client.post<{
    options: PublicKeyCredentialRequestOptionsJSON;
  }>("signInOptions");
  const response = await authenticator.authenticate(
    options.body.options,
    TEST_ORIGIN,
  );
  return client.post("signInVerify", { response });
}

/** An owner and a partner who are both signed in, and a third Member who has a pending invite. */
async function signedInHousehold() {
  const household = await createHousehold(db, {
    name: "Home",
    members: [
      { name: "Alex", role: "owner" },
      { name: "Sam", role: "member" },
      { name: "Jo", role: "member" },
    ],
  });
  const [, samId = "", joId = ""] = household.memberIds;
  const owner = createAuthTestClient(authHandlers());
  await register(owner, "setup", { setupSecret: SETUP_SECRET });
  const samInvite = await owner.post<{ token: string }>("createInvite", {
    memberId: samId,
  });
  const sam = createAuthTestClient(authHandlers());
  const samPhone = await register(sam, "invite", {
    token: samInvite.body.token,
  });
  expect(samPhone.status).toBe(200);
  const joInvite = await owner.post<{ token: string }>("createInvite", {
    memberId: joId,
  });
  return {
    householdId: household.householdId,
    samId,
    joId,
    owner,
    sam,
    samPasskey: samPhone.authenticator,
    joToken: joInvite.body.token,
  };
}

async function memberRow(id: string) {
  return (await db.select().from(members).where(eq(members.id, id))).at(0);
}

describe("makeMembersHandler", () => {
  it("ends the removed Member's sessions and passkeys at once", async () => {
    const home = await signedInHousehold();
    const sam = await memberRow(home.samId);
    const samUserId = sam?.userId ?? "";
    expect((await home.sam.get("session")).status).toBe(200);
    const recovery = await home.owner.post<{ token: string }>("createInvite", {
      memberId: home.samId,
    });
    expect(recovery.status).toBe(201);

    const response = await patchMember(home.owner, {
      id: home.samId,
      removed: true,
    });

    expect(response.status).toBe(200);
    expect((await home.sam.get("session")).status).toBe(401);
    expect((await signIn(home.samPasskey)).status).toBe(401);
    expect(
      await db.select().from(sessions).where(eq(sessions.userId, samUserId)),
    ).toEqual([]);
    expect(
      await db.select().from(passkeys).where(eq(passkeys.userId, samUserId)),
    ).toEqual([]);
    const lostDevice = createAuthTestClient(authHandlers());
    expect(
      (await lostDevice.post("inviteOptions", { token: recovery.body.token }))
        .status,
    ).not.toBe(200);
    expect((await home.owner.get("session")).status).toBe(200);
  });

  it("cancels the removed Member's pending invite", async () => {
    const home = await signedInHousehold();

    await patchMember(home.owner, { id: home.joId, removed: true });

    const jo = createAuthTestClient(authHandlers());
    expect(
      (await jo.post("inviteOptions", { token: home.joToken })).status,
    ).not.toBe(200);
    expect(
      (await home.owner.post("createInvite", { memberId: home.joId })).status,
    ).not.toBe(201);
  });

  it("syncs the removal as a soft delete that keeps the name", async () => {
    const home = await signedInHousehold();
    const scope = { db, householdId: home.householdId };
    const before = await householdRepository.find(scope);

    const response = await patchMember(home.owner, {
      id: home.samId,
      removed: true,
    });

    const clock = (before?.clock ?? 0) + 1;
    expect(await response.json()).toEqual({ clock });
    const pulled = await pullChanges(db, home.householdId, before?.clock ?? 0);
    const [removed, ...others] = pulled.tables.members ?? [];
    expect(others).toEqual([]);
    expect(removed).toMatchObject({
      id: home.samId,
      name: "Sam",
      userId: null,
      version: clock,
    });
    expect(removed).toHaveProperty("deletedAt", expect.any(Date));
  });

  it("brings a removed Member back without their old access", async () => {
    const home = await signedInHousehold();
    await patchMember(home.owner, { id: home.samId, removed: true });

    const response = await patchMember(home.owner, {
      id: home.samId,
      removed: false,
    });

    expect(response.status).toBe(200);
    expect(await memberRow(home.samId)).toMatchObject({
      deletedAt: null,
      userId: null,
    });
    expect((await home.sam.get("session")).status).toBe(401);
    expect((await signIn(home.samPasskey)).status).toBe(401);
    const invite = await home.owner.post("createInvite", {
      memberId: home.samId,
    });
    expect(invite).toMatchObject({ status: 201, body: { recovery: false } });
  });

  describe("who may remove", () => {
    let owner: FinanceSession;
    let partnerId: string;

    beforeEach(async () => {
      const seeded = await seedTestHousehold(db);
      partnerId = seeded.partnerId;
      owner = {
        sessionId: randomUUID(),
        userId: randomUUID(),
        householdId: seeded.householdId,
        memberId: seeded.memberId,
        role: "owner",
      };
    });

    it("refuses a Member who is not the owner, even for themselves", async () => {
      const partner: FinanceSession = {
        ...owner,
        memberId: partnerId,
        role: "member",
      };

      const response = await patchMember(partner, {
        id: partnerId,
        removed: true,
      });

      expect(response.status).toBe(403);
      expect((await memberRow(partnerId))?.deletedAt).toBeNull();
    });

    it("refuses the owner removing themselves", async () => {
      const response = await patchMember(owner, {
        id: owner.memberId,
        removed: true,
      });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "cannot-remove-self" });
    });

    it("refuses removing the last owner", async () => {
      await db
        .update(members)
        .set({ role: "owner" })
        .where(eq(members.id, partnerId));
      const secondOwner: FinanceSession = { ...owner, memberId: partnerId };
      expect(
        (await patchMember(owner, { id: partnerId, removed: true })).status,
      ).toBe(200);

      const response = await patchMember(secondOwner, {
        id: owner.memberId,
        removed: true,
      });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "last-owner" });
      expect((await memberRow(owner.memberId))?.deletedAt).toBeNull();
    });

    it("answers 404 for a Member of another Household", async () => {
      const other = await seedTestHousehold(db, "other");

      const response = await patchMember(owner, {
        id: other.partnerId,
        removed: true,
      });

      expect(response.status).toBe(404);
      expect((await memberRow(other.partnerId))?.deletedAt).toBeNull();
    });
  });
});
