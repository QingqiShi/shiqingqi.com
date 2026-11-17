import { expect, test, type Page } from "@playwright/test";
import { signUp } from "./sign-up.ts";

const tripTitle = (page: Page) =>
  page.getByRole("heading", { level: 1, name: "Lisbon and Porto" });
const notFound = (page: Page) =>
  page.getByRole("heading", { name: "This page doesn’t exist" });

test("a companion opens an invite link, signs up and joins the trip, until the owner takes them out", async ({
  page,
  browser,
}) => {
  await page.goto("/sample-lisbon");
  await signUp(page);
  await expect(tripTitle(page)).toBeVisible();
  await page.getByRole("button", { name: "Share" }).click();
  // Each owner of the sample trip in this database can have left a link on it.
  await page
    .getByRole("button", { name: /^Make (an invite|another) link$/ })
    .click();
  const link = await page.getByRole("textbox", { name: "Link" }).inputValue();

  const companionContext = await browser.newContext();
  const companion = await companionContext.newPage();
  await companion.goto(link);
  await expect(
    companion.getByRole("heading", { name: "Join a trip" }),
  ).toBeVisible();
  await expect(companion.getByText("Lisbon")).toHaveCount(0);
  await companion.getByRole("link", { name: "Sign in or sign up" }).click();
  // A guest of this database owns no trip.
  const email = await signUp(companion, "guest");

  // The sign-up comes back to the invite, and the trip is still closed.
  const join = companion.getByRole("button", { name: "Join the trip" });
  await expect(join).toBeVisible();
  await companion.goto("/sample-lisbon");
  await expect(notFound(companion)).toBeVisible();

  await companion.goto(link);
  await join.click();
  await expect(tripTitle(companion)).toBeVisible();
  await expect(companion).toHaveURL(/\/sample-lisbon$/);
  await expect(companion.getByRole("button", { name: "Share" })).toHaveCount(0);

  // The link was for one person.
  await companion.goto(link);
  await expect(
    companion.getByRole("heading", { name: "This invite has ended" }),
  ).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Share" }).click();
  await page
    .getByRole("listitem")
    .filter({ hasText: email })
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(page.getByText(email)).toHaveCount(0);

  await companion.goto("/sample-lisbon");
  await expect(notFound(companion)).toBeVisible();
  await companionContext.close();
});
