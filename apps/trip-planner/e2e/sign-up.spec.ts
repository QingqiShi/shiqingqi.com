import { expect, test, type Page } from "@playwright/test";
import { signUp } from "./sign-up.ts";

const signInWithPasskey = (page: Page) =>
  page.getByRole("button", { name: "Sign in with a passkey" });
const account = (page: Page) => page.getByRole("heading", { name: "Account" });

test("a visitor signs up with the emailed code, signs in again with the passkey, and deletes the account", async ({
  page,
}) => {
  await page.goto("/sign-in");
  const email = await signUp(page);

  await expect(
    page.getByRole("link", { name: /Lisbon and Porto/ }),
  ).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByText(`You are signed in as ${email}.`)).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(account(page)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Settings", level: 2 }),
  ).toBeVisible();

  await page.goto("/sign-in");
  await signInWithPasskey(page).click();
  await expect(
    page.getByRole("link", { name: /Lisbon and Porto/ }),
  ).toBeVisible();

  await page.goto("/settings");
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
