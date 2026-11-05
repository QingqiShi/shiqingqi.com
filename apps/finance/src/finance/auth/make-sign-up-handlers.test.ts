import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  accountGroups,
  categories,
  households,
  members,
  passkeys,
  signUps,
  users,
} from "#src/finance/db/schema.ts";
import { readOutbox } from "../email/make-outbox-email-sender.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import {
  createAuthTestClient,
  TEST_ORIGIN,
} from "./testing/create-auth-test-client.ts";
import { createSoftwareAuthenticator } from "./testing/create-software-authenticator.ts";
import {
  acceptInvite,
  advance,
  confirmRecoveryEmail,
  cookieShapes,
  db,
  finishSignUp,
  makeHandlers,
  now,
  outboxDir,
  recoveryTokenIn,
  requestSignUpToken,
  setUpAuthHandlerTests,
  signUp,
  signUpTokenIn,
  verificationTokenIn,
  type RegistrationOptionsBody,
} from "./testing/test-auth-handlers.ts";

setUpAuthHandlerTests();

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
    expect(sent.text).toContain(`${TEST_ORIGIN}/zh/sign-up/`);
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
    expect(sent[0]?.text).not.toContain("/sign-up/");
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
