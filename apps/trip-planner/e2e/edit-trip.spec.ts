import { expect, test, type Page } from "@playwright/test";
import { signUp } from "./sign-up.ts";

/** A new trip of the signed-in user, so that the changes of this test reach no other test. */
async function makeTrip(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const response = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Kyoto in autumn",
        firstDate: "2027-11-12",
        days: 3,
        timeZone: "Asia/Tokyo",
        language: "en",
      }),
    });
    const { tripId } = (await response.json()) as { tripId: string };
    return tripId;
  });
}

test("an owner adds a place to a day, moves it to a time, takes that back, and finds the result in the reader", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await signUp(page);
  await expect(page).toHaveURL(/\/$/);
  const tripId = await makeTrip(page);

  await page.goto(`/${tripId}`);
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(new RegExp(`/${tripId}/edit#day-0$`));

  await page.getByRole("button", { name: "Add to Day 2" }).click();
  await page.getByRole("button", { name: /^Place/ }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Fushimi Inari");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const place = page.getByRole("button", { name: /Fushimi Inari/ });
  await expect(place).toBeVisible();

  await place.click();
  await page.getByRole("radio", { name: "Clock" }).click();
  await page.getByRole("textbox", { name: "Clock time" }).fill("09:30");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(place).toContainText("09:30");

  await page.getByRole("button", { name: "Undo" }).first().click();
  await expect(place).not.toContainText("09:30");

  // The reader opens at the day of the change, not at the day it was left on.
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page).toHaveURL(new RegExp(`/${tripId}#day-1$`));
  await expect(page.getByRole("link", { name: /Fushimi Inari/ })).toBeVisible();
  await expect(page.getByText("09:30")).toHaveCount(0);
});
