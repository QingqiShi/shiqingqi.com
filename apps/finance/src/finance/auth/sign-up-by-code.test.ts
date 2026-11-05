import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { households } from "#src/finance/db/schema.ts";
import { readOutbox } from "../email/make-outbox-email-sender.ts";
import { createAuthTestClient } from "./testing/create-auth-test-client.ts";
import { createSoftwareAuthenticator } from "./testing/create-software-authenticator.ts";
import {
  acceptInvite,
  codeIn,
  db,
  finishSignUp,
  itChecksEmailCodes,
  makeHandlers,
  outboxDir,
  recoveryTokenIn,
  setUpAuthHandlerTests,
  signUp,
  signUpTokenIn,
  type Client,
} from "./testing/test-auth-handlers.ts";

setUpAuthHandlerTests();

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
