import { randomUUID } from "node:crypto";
import type { CDPSession, Page } from "@playwright/test";
import { createInvite } from "../../src/finance/auth/create-invite.ts";
import { withHousehold } from "../../src/finance/db/with-household.ts";
import { readOutbox } from "../../src/finance/email/make-outbox-email-sender.ts";
import type { FinanceEmail } from "../../src/finance/email/types.ts";
import { FINANCE_E2E_EMAIL_OUTBOX } from "./finance-e2e-env.ts";
import { expect, readSession, test } from "./finance-test.ts";
import { DESKTOP, SYNC_TIMEOUT } from "./transactions-page.ts";

test.use({ viewport: DESKTOP });

async function addAuthenticator(cdp: CDPSession): Promise<string> {
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

async function emailTo(
  to: string,
  subject: string | RegExp,
): Promise<FinanceEmail> {
  let found: FinanceEmail | undefined;
  await expect
    .poll(
      async () => {
        found = (await readOutbox(FINANCE_E2E_EMAIL_OUTBOX)).find(
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

function linkIn(email: FinanceEmail, path: string): string {
  const match = new RegExp(`https?://\\S+${path}[\\w-]+`).exec(email.text);
  if (!match) throw new Error(`No ${path} link in: ${email.text}`);
  return match[0];
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/finance/sign-in");
}

test.describe("Recovery email", () => {
  test("add and confirm an email, then get back in with the emailed code after losing the passkey", async ({
    page,
    household,
    financeDb,
    inviterId,
  }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("WebAuthn.enable");
    const lostAuthenticator = await addAuthenticator(cdp);
    const invite = await withHousehold(
      financeDb,
      household.householdId,
      (scope) =>
        createInvite(scope, {
          memberId: household.memberIds.alex,
          createdBy: inviterId,
          allowRecovery: true,
          now: new Date(),
        }),
    );
    if (!invite.ok) throw new Error(`No invite: ${invite.reason}`);
    await page.goto(`/finance/invite/${invite.token}`);
    await page.getByRole("button", { name: "Save a new passkey" }).click();
    await page.waitForURL((url) => url.pathname === "/finance");
    const address = `alex-${randomUUID()}@example.com`;

    await page.goto("/finance/settings/members");
    await expect(
      page.getByRole("heading", { name: "Your recovery email" }),
    ).toBeVisible({ timeout: SYNC_TIMEOUT });
    await page.getByRole("textbox", { name: "Recovery email" }).fill(address);
    await page.getByRole("button", { name: "Send confirmation link" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: address }),
    ).toBeVisible();
    await expect(
      page.getByText("Not confirmed", { exact: true }),
    ).toBeVisible();

    const confirmation = await emailTo(
      address,
      "Confirm your Finance recovery email",
    );
    await page.goto(linkIn(confirmation, "/finance/verify-email/"));
    await page.getByRole("button", { name: "Confirm email" }).click();
    await expect(
      page.getByRole("heading", { name: "Recovery email confirmed" }),
    ).toBeVisible();
    await page.goto("/finance/settings/members");
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible({
      timeout: SYNC_TIMEOUT,
    });

    await signOut(page);
    const { credentials } = await cdp.send("WebAuthn.getCredentials", {
      authenticatorId: lostAuthenticator,
    });
    expect(credentials).toHaveLength(1);
    const [lostCredential] = credentials;
    await cdp.send("WebAuthn.removeVirtualAuthenticator", {
      authenticatorId: lostAuthenticator,
    });

    await page.getByRole("button", { name: "Lost your passkey?" }).click();
    await page
      .getByRole("textbox", { name: "Recovery email" })
      .fill(address.toUpperCase());
    await page.getByRole("button", { name: "Email me a code" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "we sent a code to it" }),
    ).toBeVisible();
    const recovery = await emailTo(
      address,
      /^\d{6} is your Finance recovery code$/,
    );
    expect(recovery.text).toContain("Home\nhttp");
    const code = recovery.subject.slice(0, 6);

    const newAuthenticator = await addAuthenticator(cdp);
    await page.getByRole("textbox", { name: "Code" }).fill(code);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", { name: "Back into Home" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save a new passkey" }).click();
    await page.waitForURL((url) => url.pathname === "/finance");
    expect((await readSession(page)).householdId).toBe(household.householdId);

    await signOut(page);
    await page.getByRole("button", { name: "Sign in with a passkey" }).click();
    await page.waitForURL((url) => url.pathname === "/finance");
    expect((await readSession(page)).householdId).toBe(household.householdId);

    await signOut(page);
    await cdp.send("WebAuthn.removeVirtualAuthenticator", {
      authenticatorId: newAuthenticator,
    });
    await cdp.send("WebAuthn.addCredential", {
      authenticatorId: await addAuthenticator(cdp),
      credential: lostCredential,
    });
    await page.getByRole("button", { name: "Sign in with a passkey" }).click();
    await expect(
      page.getByRole("alert").filter({
        hasText: "This passkey is not registered for Finance",
      }),
    ).toBeVisible();
    await expect(page).toHaveURL("/finance/sign-in");
  });
});
