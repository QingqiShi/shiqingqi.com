import { expect, test, type Page } from "@playwright/test";
import { samplePassword } from "./sample-password.ts";

const dayTitle = (page: Page) => page.getByRole("heading", { level: 2 });

async function unlock(page: Page) {
  await page.getByLabel("Trip password").fill(samplePassword);
  await page.getByRole("button", { name: "Open the trip" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Lisbon and Porto" }),
  ).toBeVisible();
}

test("a visitor unlocks the sample trip and steps through its days", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Lisbon and Porto/ }).click();
  await unlock(page);

  await page
    .getByRole("combobox", { name: "Day", exact: true })
    .selectOption({ index: 1 });
  await expect(dayTitle(page)).toHaveText("Day trip to Sintra");
  await expect(page).toHaveURL(/#day-1$/);

  await page.getByRole("button", { name: "Next day" }).click();
  await expect(dayTitle(page)).toHaveText("Train to Porto");
  await page.getByRole("button", { name: "Previous day" }).click();
  await expect(dayTitle(page)).toHaveText("Day trip to Sintra");

  await page.getByRole("radio", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/#calendar$/);
  await page.getByRole("link", { name: /Porto and the Douro/ }).click();
  await expect(dayTitle(page)).toHaveText("Porto and the Douro");
  await expect(page).toHaveURL(/#day-3$/);

  await page.getByRole("link", { name: "Trips", exact: true }).click();
  await page.getByRole("link", { name: /Lisbon and Porto/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Lisbon and Porto" }),
  ).toBeVisible();
  await expect(page.getByLabel("Trip password")).toHaveCount(0);
});

test("an opened trip reads with no network", async ({ page, context }) => {
  await page.goto("/unlock/sample-lisbon");
  await unlock(page);
  await expect
    .poll(() =>
      page.evaluate(async () => (await caches.match("/sample-lisbon")) != null),
    )
    .toBe(true);

  await page
    .getByRole("combobox", { name: "Day", exact: true })
    .selectOption({ index: 1 });
  await context.setOffline(true);
  await page.reload();
  await expect(dayTitle(page)).toHaveText("Day trip to Sintra");
  await page.getByRole("button", { name: "Next day" }).click();
  await expect(dayTitle(page)).toHaveText("Train to Porto");

  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "You are offline" }),
  ).toBeVisible();
});
