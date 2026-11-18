import { expect, test } from "@playwright/test";
import { signUp } from "./sign-up.ts";

test("a person with no trips makes one, lands on it, adds a place to it in the editor, and finds the place in the reader", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await signUp(page, "guest");
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: "New trip" }).click();
  const sheet = page.getByRole("dialog", { name: "New trip" });
  await sheet.getByRole("textbox", { name: "Title" }).fill("Lisbon in spring");
  await sheet.getByLabel("First day").fill("2027-04-10");
  await sheet.getByLabel("Last day").fill("2027-04-12");
  await sheet.getByRole("button", { name: "Create trip" }).click();

  await expect(page).toHaveURL(/\/[\w-]+$/);
  await expect(
    page.getByRole("heading", { name: "Lisbon in spring" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Plan this day" }).click();
  await expect(page).toHaveURL(/\/[\w-]+\/edit/);
  await page.getByRole("button", { name: "Add to Day 1" }).click();
  await page.getByRole("button", { name: /^Place/ }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Belém Tower");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("button", { name: /Belém Tower/ })).toBeVisible();

  await page.getByRole("button", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/[\w-]+#day-0$/);
  await expect(
    page.getByRole("heading", { name: "Lisbon in spring" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Belém Tower/ })).toBeVisible();
});
