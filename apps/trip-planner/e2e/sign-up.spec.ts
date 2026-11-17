import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { readOutbox } from "@tuja/server-email/make-outbox-email-sender";
import { emailOutbox } from "./email-outbox.ts";

const port = execFileSync(
  "node",
  ["../../scripts/get-worktree-port.mjs", "100"],
  { encoding: "utf8" },
).trim();

/** A CDP virtual authenticator on `page`, so that passkey ceremonies complete without a person. */
async function addVirtualAuthenticator(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

async function signUpCode(email: string): Promise<string> {
  let code: string | undefined;
  await expect
    .poll(async () => {
      const sent = (await readOutbox(emailOutbox(port))).findLast(
        ({ to }) => to === email,
      );
      code = /^(\d{6}) is your Trips sign-up code$/.exec(
        sent?.subject ?? "",
      )?.[1];
      return code;
    })
    .toBeDefined();
  if (!code) throw new Error(`No sign-up code for ${email}`);
  return code;
}

const signInWithPasskey = (page: Page) =>
  page.getByRole("button", { name: "Sign in with a passkey" });
const account = (page: Page) => page.getByRole("heading", { name: "Account" });

test("a visitor signs up with the emailed code, signs in again with the passkey, and deletes the account", async ({
  page,
}) => {
  await addVirtualAuthenticator(page);
  const email = `mara-${crypto.randomUUID()}@example.com`;

  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByRole("button", { name: "Email me a sign-up code" }).click();
  await page
    .getByRole("textbox", { name: "Code" })
    .fill(await signUpCode(email));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Save a passkey" }).click();

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText(`You are signed in as ${email}.`)).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(account(page)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Settings", level: 2 }),
  ).toBeVisible();

  await page.goto("/sign-in");
  await signInWithPasskey(page).click();
  await expect(page.getByText(`You are signed in as ${email}.`)).toBeVisible();

  await page.getByRole("button", { name: "Delete account" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete account" })
    .click();
  await expect(account(page)).toHaveCount(0);

  await page.goto("/sign-in");
  await signInWithPasskey(page).click();
  await expect(
    page.getByText("This passkey belongs to no account."),
  ).toBeVisible();
});
