import { createSoftwareAuthenticator } from "@tuja/server-auth/testing/create-software-authenticator";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { members, passkeys, users } from "#src/finance/db/schema.ts";
import { withHousehold } from "#src/finance/db/with-household.ts";
import { readOutbox } from "../email/make-outbox-email-sender.ts";
import type { AuthHandlerDeps } from "./make-auth-handlers.ts";
import { revokeMemberAccess } from "./revoke-member-access.ts";
import {
  createAuthTestClient,
  TEST_ORIGIN,
} from "./testing/create-auth-test-client.ts";
import {
  advance,
  afterTasks,
  codeIn,
  confirmRecoveryEmail,
  cookieShapes,
  db,
  itChecksEmailCodes,
  makeHandlers,
  now,
  otherCode,
  outboxDir,
  recover,
  recoveryTokenIn,
  setUpAuthHandlerTests,
  signIn,
  signUp,
  verificationTokenIn,
  type Client,
  type RegistrationOptionsBody,
} from "./testing/test-auth-handlers.ts";

setUpAuthHandlerTests();

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
    expect(notices[0]?.text).toContain(`${TEST_ORIGIN}/zh/settings/members`);
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

  /** Removes the Member the way the members route does. */
  async function removeMember(
    { householdId, memberId }: { householdId: string; memberId: string },
    userId: string,
  ) {
    await withHousehold(db, householdId, async (scope) => {
      await scope.db
        .update(members)
        .set({ deletedAt: now })
        .where(eq(members.id, memberId));
      await revokeMemberAccess(scope, { memberId, userId });
    });
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
    const { lostDevice, lostPhone, userId } =
      await ownerWithEmail("qingqi@example.com");

    await requestRecovery("qingqi@example.com");
    const [sent] = await readOutbox(outboxDir);
    const link = recoveryTokenIn(sent.text);

    const newPhone = createSoftwareAuthenticator();
    const newDevice = createAuthTestClient(makeHandlers());
    const recovered = await recover(newDevice, newPhone, link);

    expect(recovered).toMatchObject({ status: 200, body: { ok: true } });
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
        await recover(
          createAuthTestClient(makeHandlers()),
          createSoftwareAuthenticator(),
          link,
        )
      ).status,
    ).toBe(410);
  });

  /**
   * Handlers on a database that counts its transactions, and that runs
   * `state.task` before transaction number `state.runBefore`.
   */
  function racingHandlers() {
    const state = {
      transactions: 0,
      runBefore: 0,
      task: (): Promise<unknown> => Promise.resolve(),
    };
    const racingDb = new Proxy(db, {
      get(target, key) {
        const value: unknown = Reflect.get(target, key);
        if (key !== "transaction") return value;
        const transaction: typeof db.transaction = async (...args) => {
          state.transactions += 1;
          if (state.transactions === state.runBefore) await state.task();
          return target.transaction(...args);
        };
        return transaction;
      },
    });
    return { state, handlers: makeHandlers({ getDb: () => racingDb }) };
  }

  /**
   * Sends `request` two times. The first time counts its transactions. The
   * second time, a recovery of the user is complete before the last one.
   */
  async function raceWithRecovery(
    state: ReturnType<typeof racingHandlers>["state"],
    request: () => Promise<{ status: number }>,
  ) {
    await requestRecovery("qingqi@example.com");
    const [sent] = await readOutbox(outboxDir);
    const link = recoveryTokenIn(sent.text);

    state.transactions = 0;
    expect((await request()).status).toBe(200);
    state.runBefore = state.transactions;
    state.transactions = 0;
    state.task = async () => {
      const recovered = await recover(
        createAuthTestClient(makeHandlers()),
        createSoftwareAuthenticator(),
        link,
      );
      expect(recovered.status).toBe(200);
    };
    return request();
  }

  it("gives no session to a lost passkey whose sign-in was under way when recovery ended it", async () => {
    const { lostPhone } = await ownerWithEmail("qingqi@example.com");
    const { state, handlers } = racingHandlers();
    let lostDevice = createAuthTestClient(handlers);

    const result = await raceWithRecovery(state, async () => {
      lostDevice = createAuthTestClient(handlers);
      return signIn(lostDevice, lostPhone);
    });

    expect(result.status).toBe(401);
    expect((await lostDevice.get("session")).status).toBe(401);
  });

  it("saves no passkey for a session that recovery ended while the passkey was on its way", async () => {
    const { lostPhone } = await ownerWithEmail("qingqi@example.com");
    const { state, handlers } = racingHandlers();
    const lostDevice = createAuthTestClient(handlers);
    await signIn(lostDevice, lostPhone);

    const result = await raceWithRecovery(state, async () => {
      const options =
        await lostDevice.post<RegistrationOptionsBody>("passkeyOptions");
      const response = await createSoftwareAuthenticator().register(
        options.body.options,
        TEST_ORIGIN,
      );
      return lostDevice.post("passkeyVerify", { response });
    });

    expect(result.status).toBe(401);
    expect(await db.select().from(passkeys)).toHaveLength(1);
  });

  it("refuses a recovery link after 30 minutes", async () => {
    await ownerWithEmail("qingqi@example.com");
    await requestRecovery("qingqi@example.com");
    const token = recoveryTokenIn((await readOutbox(outboxDir))[0]?.text);
    advance(31 * 60 * 1000);

    const result = await recover(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      token,
    );

    expect(result.status).toBe(410);
  });

  it("sends nothing for a removed member", async () => {
    const { result, userId } = await ownerWithEmail("qingqi@example.com");
    await removeMember(result.body, userId);

    expect((await requestRecovery("qingqi@example.com")).status).toBe(202);

    expect(await readOutbox(outboxDir)).toEqual([]);
  });

  it("gives no session when the member is removed after the link was opened", async () => {
    const { result, userId } = await ownerWithEmail("qingqi@example.com");
    await requestRecovery("qingqi@example.com");
    const token = recoveryTokenIn((await readOutbox(outboxDir))[0]?.text);
    const browser = createAuthTestClient(makeHandlers());
    const options = await browser.post<RegistrationOptionsBody>(
      "recoveryOptions",
      { token },
    );
    const response = await createSoftwareAuthenticator().register(
      options.body.options,
      TEST_ORIGIN,
    );
    await removeMember(result.body, userId);

    const verified = await browser.post("recoveryVerify", { token, response });

    expect(verified).toMatchObject({
      status: 410,
      body: { error: "recovery_invalid" },
    });
    expect((await browser.get("session")).status).toBe(401);
    expect(
      await db
        .select({ id: passkeys.id })
        .from(passkeys)
        .where(eq(passkeys.userId, userId)),
    ).toEqual([]);
  });

  it("gets back in with the emailed code in the browser that asked, and the emailed link still works", async () => {
    const { lostDevice, userId } = await ownerWithEmail("qingqi@example.com");
    const { browser, code, sent } = await browserWithCode("qingqi@example.com");
    expect(sent?.subject).toBe(`${code} is your Finance recovery code`);

    const entered = await enterCode(
      browser,
      ` ${code.slice(0, 3)} ${code.slice(3)} `,
    );

    expect(entered.status).toBe(200);
    const token = recoveryTokenIn(entered.body.path);
    const newPhone = createSoftwareAuthenticator();
    const recovered = await recover(browser, newPhone, token);
    expect(recovered).toMatchObject({ status: 200, body: { ok: true } });
    expect((await browser.get("session")).body).toMatchObject({ userId });
    expect((await lostDevice.get("session")).status).toBe(401);
    expect((await enterCode(browser, code)).status).toBe(410);

    const emailed = recoveryTokenIn(sent?.text);
    const emailedLink = await createAuthTestClient(makeHandlers()).post(
      "recoveryOptions",
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
