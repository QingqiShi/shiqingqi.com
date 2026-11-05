import { randomUUID } from "node:crypto";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  households,
  members,
  passkeys,
  sessions,
  users,
} from "#src/finance/db/schema.ts";
import { createTestHousehold } from "#src/finance/db/testing/create-test-household.ts";
import { withHousehold } from "#src/finance/db/with-household.ts";
import { guardFinanceRequest } from "../http/guard-finance-request.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import { makeGetFinanceSession } from "./get-finance-session.ts";
import { hashToken } from "./hash-token.ts";
import {
  createAuthTestClient,
  TEST_ORIGIN,
} from "./testing/create-auth-test-client.ts";
import { createSoftwareAuthenticator } from "./testing/create-software-authenticator.ts";
import {
  advance,
  DAY_MS,
  db,
  importedHousehold,
  makeHandlers,
  now,
  setUpAuthHandlerTests,
  signIn,
  signUp,
  type Client,
  type RegistrationOptionsBody,
} from "./testing/test-auth-handlers.ts";

setUpAuthHandlerTests();

describe("sign-in and sessions", () => {
  async function signedUpAuthenticator() {
    const authenticator = createSoftwareAuthenticator();
    await signUp(createAuthTestClient(makeHandlers()), authenticator);
    return authenticator;
  }

  function sessionRequest(client: Client) {
    return new Request(`${TEST_ORIGIN}/api/sync`, {
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
    const request = new Request(`${TEST_ORIGIN}/api/sync`, {
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
