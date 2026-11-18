import { expect, test } from "@playwright/test";
import { signUp } from "./sign-up.ts";

test("a person with no trips opens New trip, makes a blank trip from it, and lands on it in the reader", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await signUp(page, "guest");
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("link", { name: "New trip" }).click();
  await expect(page).toHaveURL(/\/new$/);
  await expect(
    page.getByRole("heading", { name: "New trip", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Where, when, who, or paste a plan" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Create a blank trip" }).click();
  const sheet = page.getByRole("dialog", { name: "Blank trip" });
  await sheet.getByRole("textbox", { name: "Title" }).fill("Lisbon in spring");
  await sheet.getByLabel("First day").fill("2027-04-10");
  await sheet.getByLabel("Last day").fill("2027-04-12");
  await sheet.getByRole("button", { name: "Create trip" }).click();

  await expect(page).toHaveURL(/\/[\w-]+$/);
  await expect(page).not.toHaveURL(/\/new$/);
  await expect(
    page.getByRole("heading", { name: "Lisbon in spring" }),
  ).toBeVisible();
  await expect(page.getByText("Nothing planned yet")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Trip details" }).first(),
  ).toBeVisible();
});
