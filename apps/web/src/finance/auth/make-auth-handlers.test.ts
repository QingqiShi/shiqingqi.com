import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  categories,
  households,
  invites,
  members,
  passkeys,
  sessions,
} from "#src/finance/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/finance/db/testing/create-test-db.ts";
import { createHousehold } from "./create-household.ts";
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

const SETUP_SECRET = "correct horse battery staple";
const DAY_MS = 24 * 60 * 60 * 1000;

type Authenticator = ReturnType<typeof createSoftwareAuthenticator>;
type Client = ReturnType<typeof createAuthTestClient>;
interface RegistrationOptionsBody {
  options: PublicKeyCredentialCreationOptionsJSON;
  mode?: string;
  memberName?: string;
  householdName?: string;
}
interface SignedInBody {
  householdId: string;
  memberId: string;
}

let db: TestDb;
let now: Date;

function makeHandlers(overrides: Partial<AuthHandlerDeps> = {}) {
  return makeAuthHandlers({
    getDb: () => db,
    now: () => now,
    authSecret: () => "test-auth-secret",
    setupSecret: () => SETUP_SECRET,
    limitRequest: () => Promise.resolve({ success: true, reset: 0 }),
    isAllowedOrigin: isAllowedFinanceOrigin,
    ...overrides,
  });
}

function advance(ms: number) {
  now = new Date(now.getTime() + ms);
}

async function setUp(
  client: Client,
  authenticator: Authenticator,
  setupSecret = SETUP_SECRET,
) {
  const options = await client.post<RegistrationOptionsBody>("setupOptions", {
    setupSecret,
    memberName: "Qingqi",
  });
  expect(options.status).toBe(200);
  const response = await authenticator.register(
    options.body.options,
    TEST_ORIGIN,
  );
  return client.post<SignedInBody>("setupVerify", {
    setupSecret,
    householdName: "Home",
    memberName: "Qingqi",
    response,
  });
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
) {
  const options = await client.post<RegistrationOptionsBody>("inviteOptions", {
    token,
  });
  if (options.status !== 200) return options;
  const response = await authenticator.register(
    options.body.options,
    TEST_ORIGIN,
  );
  return client.post<SignedInBody>("inviteVerify", { token, response });
}

/** A household from the importer: two members, neither signed in. */
async function importedHousehold() {
  return createHousehold(db, {
    name: "Home",
    members: [
      { name: "Qingqi", role: "owner" },
      { name: "Partner", role: "member" },
    ],
  });
}

beforeEach(async () => {
  db = await createTestDb();
  now = new Date("2026-10-10T12:00:00Z");
});

afterEach(async () => {
  await db.close();
});

describe("setup", () => {
  it("creates the household, owner, system categories, passkey and session", async () => {
    const client = createAuthTestClient(makeHandlers());
    const authenticator = createSoftwareAuthenticator();

    const result = await setUp(client, authenticator);

    expect(result.status).toBe(200);
    const household = (await db.select().from(households)).at(0);
    expect(household).toMatchObject({
      id: result.body.householdId,
      name: "Home",
      baseCurrency: "GBP",
      timezone: "Europe/London",
    });
    const owner = (await db.select().from(members)).at(0);
    expect(owner).toMatchObject({
      id: result.body.memberId,
      name: "Qingqi",
      role: "owner",
    });
    expect(owner?.userId).toEqual(expect.any(String));
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

  it("closes when the household has no owner member", async () => {
    await createHousehold(db, {
      name: "Home",
      members: [{ name: "Partner", role: "member" }],
    });

    const result = await createAuthTestClient(makeHandlers()).post(
      "setupOptions",
      { setupSecret: SETUP_SECRET },
    );

    expect(result).toMatchObject({
      status: 403,
      body: { error: "setup_closed" },
    });
  });

  it("claims the unclaimed owner member of an imported household", async () => {
    const imported = await importedHousehold();
    const client = createAuthTestClient(makeHandlers());

    const options = await client.post<RegistrationOptionsBody>("setupOptions", {
      setupSecret: SETUP_SECRET,
    });
    expect(options.body).toMatchObject({
      mode: "claim",
      householdName: "Home",
      memberName: "Qingqi",
    });
    const response = await createSoftwareAuthenticator().register(
      options.body.options,
      TEST_ORIGIN,
    );
    const result = await client.post<SignedInBody>("setupVerify", {
      setupSecret: SETUP_SECRET,
      response,
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      householdId: imported.householdId,
      memberId: imported.memberIds[0],
    });
    expect(await db.select().from(households)).toHaveLength(1);
    const owner = (
      await db
        .select()
        .from(members)
        .where(eq(members.id, imported.memberIds[0] ?? ""))
    ).at(0);
    expect(owner?.userId).toEqual(expect.any(String));
    expect(owner?.version).toBe(2);
    const household = (await db.select().from(households)).at(0);
    expect(household?.clock).toBe(2);
  });

  it("rejects a wrong or missing setup secret", async () => {
    const client = createAuthTestClient(makeHandlers());
    const wrong = await client.post("setupOptions", {
      setupSecret: "wrong",
    });
    expect(wrong).toMatchObject({
      status: 403,
      body: { error: "setup_forbidden" },
    });

    const unset = await createAuthTestClient(
      makeHandlers({ setupSecret: () => undefined }),
    ).post("setupOptions", { setupSecret: "" });
    expect(unset.status).toBe(403);

    const authenticator = createSoftwareAuthenticator();
    const options = await client.post<RegistrationOptionsBody>("setupOptions", {
      setupSecret: SETUP_SECRET,
    });
    const response = await authenticator.register(
      options.body.options,
      TEST_ORIGIN,
    );
    const verify = await client.post("setupVerify", {
      setupSecret: "wrong",
      response,
    });
    expect(verify.status).toBe(403);
    expect(await db.select().from(households)).toHaveLength(0);
  });
});

describe("owner recovery with the setup secret", () => {
  async function claimedOwner() {
    const lostPhone = createSoftwareAuthenticator();
    const lostDevice = createAuthTestClient(makeHandlers());
    const result = await setUp(lostDevice, lostPhone);
    const owner = (
      await db
        .select()
        .from(members)
        .where(eq(members.id, result.body.memberId))
    ).at(0);
    return { result, owner, lostPhone, lostDevice };
  }

  async function recover(
    client: Client,
    authenticator: Authenticator,
    setupSecret = SETUP_SECRET,
  ) {
    const options = await client.post<RegistrationOptionsBody>("setupOptions", {
      setupSecret,
    });
    if (options.status !== 200) return options;
    const response = await authenticator.register(
      options.body.options,
      TEST_ORIGIN,
    );
    return client.post<SignedInBody>("setupVerify", { setupSecret, response });
  }

  it("names the owner only to a visitor with the setup secret", async () => {
    await claimedOwner();
    const client = createAuthTestClient(makeHandlers());

    const wrong = await client.post("setupOptions", { setupSecret: "wrong" });
    const right = await client.post<RegistrationOptionsBody>("setupOptions", {
      setupSecret: SETUP_SECRET,
    });

    expect(wrong).toMatchObject({
      status: 403,
      body: { error: "setup_forbidden" },
    });
    expect(right).toMatchObject({
      status: 200,
      body: { mode: "recover", householdName: "Home", memberName: "Qingqi" },
    });
  });

  it("gives the owner's user a new passkey and ends the lost device", async () => {
    const { result, owner, lostPhone, lostDevice } = await claimedOwner();
    const newPhone = createSoftwareAuthenticator();
    const newDevice = createAuthTestClient(makeHandlers());

    const recovered = await recover(newDevice, newPhone);

    expect(recovered).toMatchObject({ status: 200, body: result.body });
    const session = await newDevice.get("session");
    expect(session.body).toEqual({
      userId: owner?.userId,
      householdId: result.body.householdId,
      memberId: result.body.memberId,
      role: "owner",
    });
    const stored = await db
      .select({ id: passkeys.id })
      .from(passkeys)
      .where(eq(passkeys.userId, owner?.userId ?? ""));
    expect(stored).toEqual([{ id: newPhone.credentials[0]?.id }]);
    expect((await lostDevice.get("session")).status).toBe(401);
    expect(
      await db
        .select({ userId: sessions.userId })
        .from(sessions)
        .where(eq(sessions.userId, owner?.userId ?? "")),
    ).toHaveLength(1);
    expect(
      (await signIn(createAuthTestClient(makeHandlers()), lostPhone)).status,
    ).toBe(401);
    expect(
      (await signIn(createAuthTestClient(makeHandlers()), newPhone)).status,
    ).toBe(200);
  });

  it("changes nothing with a wrong setup secret", async () => {
    const { lostPhone, lostDevice } = await claimedOwner();
    const client = createAuthTestClient(makeHandlers());

    const wrongOptions = await recover(
      client,
      createSoftwareAuthenticator(),
      "wrong",
    );
    const options = await client.post<RegistrationOptionsBody>("setupOptions", {
      setupSecret: SETUP_SECRET,
    });
    const wrongVerify = await client.post("setupVerify", {
      setupSecret: "wrong",
      response: await createSoftwareAuthenticator().register(
        options.body.options,
        TEST_ORIGIN,
      ),
    });

    expect(wrongOptions.status).toBe(403);
    expect(wrongVerify.status).toBe(403);
    expect(await db.select().from(passkeys)).toHaveLength(1);
    expect((await lostDevice.get("session")).status).toBe(200);
    expect(
      (await signIn(createAuthTestClient(makeHandlers()), lostPhone)).status,
    ).toBe(200);
  });

  it("refuses a create ceremony that finishes after the owner is claimed", async () => {
    const late = createAuthTestClient(makeHandlers());
    const options = await late.post<RegistrationOptionsBody>("setupOptions", {
      setupSecret: SETUP_SECRET,
      memberName: "Late",
    });
    expect(options.body.mode).toBe("create");
    const { lostPhone } = await claimedOwner();

    const result = await late.post("setupVerify", {
      setupSecret: SETUP_SECRET,
      response: await createSoftwareAuthenticator().register(
        options.body.options,
        TEST_ORIGIN,
      ),
    });

    expect(result).toMatchObject({
      status: 403,
      body: { error: "setup_closed" },
    });
    expect(await db.select().from(households)).toHaveLength(1);
    expect(
      (await signIn(createAuthTestClient(makeHandlers()), lostPhone)).status,
    ).toBe(200);
  });
});

describe("sign-in and sessions", () => {
  async function signedUpAuthenticator() {
    const authenticator = createSoftwareAuthenticator();
    await setUp(createAuthTestClient(makeHandlers()), authenticator);
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

  it("renews the cookie from an auth route too", async () => {
    const authenticator = await signedUpAuthenticator();
    const client = createAuthTestClient(makeHandlers());
    await signIn(client, authenticator);

    advance(8 * DAY_MS);
    const result = await client.get("session");

    expect(result.status).toBe(200);
    expect(result.setCookies.join("\n")).toMatch(/^finance_session=/m);
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

  it("returns no session when finance is not configured", async () => {
    const getFinanceSession = makeGetFinanceSession({
      getDb: () => null,
      now: () => now,
      reissueCookie: () => Promise.resolve(),
    });
    const request = new Request(`${TEST_ORIGIN}/api/finance/sync`, {
      headers: { Cookie: `${financeSessionCookie.name}=anything` },
    });

    expect(await getFinanceSession(request)).toBeNull();
    const response = await createAuthTestClient(
      makeHandlers({ getDb: () => null }),
    ).post("signInOptions");
    expect(response.status).toBe(503);
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
    const imported = await importedHousehold();
    const owner = createAuthTestClient(makeHandlers());
    const options = await owner.post<RegistrationOptionsBody>("setupOptions", {
      setupSecret: SETUP_SECRET,
    });
    await owner.post("setupVerify", {
      setupSecret: SETUP_SECRET,
      response: await createSoftwareAuthenticator().register(
        options.body.options,
        TEST_ORIGIN,
      ),
    });
    const invite = await owner.post<{ token: string; path: string }>(
      "createInvite",
      { memberId: imported.memberIds[1] },
    );
    return { imported, owner, invite };
  }

  it("binds a new user to the invited member and starts a session", async () => {
    const { imported, invite } = await ownerAndInvite();
    expect(invite.status).toBe(201);
    expect(invite.body.path).toBe(`/finance/invite/${invite.body.token}`);

    const partner = createAuthTestClient(makeHandlers());
    const options = await partner.post<RegistrationOptionsBody>(
      "inviteOptions",
      { token: invite.body.token },
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
    });

    expect(result.status).toBe(200);
    const session = await partner.get("session");
    expect(session.body).toMatchObject({
      householdId: imported.householdId,
      memberId: imported.memberIds[1],
      role: "member",
    });
    const used = (await db.select().from(invites)).at(0);
    expect(used?.usedAt).toEqual(now);
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
    const other = await createHousehold(db, {
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
    const imported = await importedHousehold();
    const owner = createAuthTestClient(makeHandlers());
    const setup = await owner.post<RegistrationOptionsBody>("setupOptions", {
      setupSecret: SETUP_SECRET,
    });
    await owner.post("setupVerify", {
      setupSecret: SETUP_SECRET,
      response: await createSoftwareAuthenticator().register(
        setup.body.options,
        TEST_ORIGIN,
      ),
    });
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

describe("expired sessions", () => {
  it("are deleted when the user starts a new session", async () => {
    const client = createAuthTestClient(makeHandlers());
    const authenticator = createSoftwareAuthenticator();
    await setUp(client, authenticator);
    advance(401 * DAY_MS);

    await signIn(createAuthTestClient(makeHandlers()), authenticator);

    const rows = await db.select().from(sessions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.expiresAt.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe("add a passkey", () => {
  it("registers a second passkey that can sign in", async () => {
    const first = createSoftwareAuthenticator();
    const client = createAuthTestClient(makeHandlers());
    await setUp(client, first);

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
  });
});
