import type { Page } from "@playwright/test";
import {
  addAuthenticator,
  clickUntil,
  emailTo,
  expect,
  linkIn,
  readSession,
  signInWithPasskey,
  signInWithRecoveryInvite,
  test,
  uniqueEmail,
} from "./finance-test.ts";
import { clickSignOut, DESKTOP, SYNC_TIMEOUT } from "./transactions-page.ts";

test.use({ viewport: DESKTOP });

async function signOut(page: Page) {
  await clickSignOut(page);
  await expect(page).toHaveURL("/finance/sign-in");
}

test.describe("Recovery email", () => {
  test("add and confirm an email, then get back in with the emailed code after losing the passkey", async ({
    page,
    household,
    financeDb,
  }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("WebAuthn.enable");
    const lostAuthenticator = await addAuthenticator(cdp);
    await signInWithRecoveryInvite(page, financeDb, household);
    const address = uniqueEmail("alex");

    await page.goto("/finance/settings/members");
    await expect(
      page.getByRole("heading", { name: "Your recovery email" }),
    ).toBeVisible({ timeout: SYNC_TIMEOUT });
    await page.getByRole("textbox", { name: "Recovery email" }).fill(address);
    await page.getByRole("button", { name: "Send confirmation link" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: address }),
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

    const recoveryField = page.getByRole("textbox", {
      name: "Recovery email",
    });
    await expect(async () => {
      if (!(await recoveryField.isVisible())) {
        await page
          .getByRole("button", { name: "Lost your passkey?" })
          .click({ timeout: 2000 });
      }
      await expect(recoveryField).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: SYNC_TIMEOUT });
    await recoveryField.fill(address.toUpperCase());
    await page.getByRole("button", { name: "Email me a code" }).click();
    const recovery = await emailTo(
      address,
      /^\d{6} is your Finance recovery code$/,
    );
    expect(recovery.text).toContain("/finance/invite/");
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
    await signInWithPasskey(page);
    expect((await readSession(page)).householdId).toBe(household.householdId);

    await signOut(page);
    await cdp.send("WebAuthn.removeVirtualAuthenticator", {
      authenticatorId: newAuthenticator,
    });
    await cdp.send("WebAuthn.addCredential", {
      authenticatorId: await addAuthenticator(cdp),
      credential: lostCredential,
    });
    await clickUntil(
      page.getByRole("button", { name: "Sign in with a passkey" }),
      () =>
        expect(
          page.getByRole("alert").filter({
            hasText: "This passkey is not registered for Finance",
          }),
        ).toBeVisible({ timeout: 5000 }),
    );
    await expect(page).toHaveURL("/finance/sign-in");
  });
});
