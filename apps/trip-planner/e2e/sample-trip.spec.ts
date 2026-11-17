import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_TRIP_ID } from "../src/trips/sample-trip-id.ts";
import { signUp } from "./sign-up.ts";

const tripPath = `/${SAMPLE_TRIP_ID}`;

const dayTitle = (page: Page) => page.getByRole("heading", { level: 2 });
const tripTitle = (page: Page) =>
  page.getByRole("heading", { level: 1, name: "Lisbon and Porto" });

test("a visitor finds sign-up from the landing page, opens a trip, signs up, and steps through its days", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sign up or sign in" }).click();
  await expect(
    page.getByRole("button", { name: "Email me a sign-up code" }),
  ).toBeVisible();

  await page.goto(tripPath);
  await expect(page).toHaveURL(
    new RegExp(`/sign-in\\?next=%2F${SAMPLE_TRIP_ID}$`),
  );
  await signUp(page);
  await expect(tripTitle(page)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${tripPath}$`));

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
  await expect(tripTitle(page)).toBeVisible();
});

const isTripKept = (page: Page) =>
  page.evaluate(async (path) => (await caches.match(path)) != null, tripPath);

test("an opened trip reads with no network, until the user signs out", async ({
  page,
  context,
}) => {
  await page.goto(tripPath);
  await signUp(page);
  await expect(tripTitle(page)).toBeVisible();
  await expect.poll(() => isTripKept(page)).toBe(true);

  await page
    .getByRole("combobox", { name: "Day", exact: true })
    .selectOption({ index: 1 });
  await context.setOffline(true);
  await page.reload();
  await expect(dayTitle(page)).toHaveText("Day trip to Sintra");
  await page.getByRole("button", { name: "Next day" }).click();
  await expect(dayTitle(page)).toHaveText("Train to Porto");

  await context.setOffline(false);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Account" })).toHaveCount(0);
  expect(await isTripKept(page)).toBe(false);

  await context.setOffline(true);
  await page.goto(tripPath);
  await expect(
    page.getByRole("heading", { name: "You are offline" }),
  ).toBeVisible();
});
