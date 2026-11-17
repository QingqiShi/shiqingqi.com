import { expect, test } from "@playwright/test";
import { SAMPLE_TRIP_ID } from "../src/trips/sample-trip-id.ts";
import { signUp } from "./sign-up.ts";

const tripPath = `/${SAMPLE_TRIP_ID}`;

// The sample trip came from a seed with no author, so the first change of a
// new owner makes a version of its own. Other specs can change the trip at
// the same time, so the steps look only at the newest versions.
test("an owner changes a time, finds the version before it in the history, and restores it", async ({
  page,
}) => {
  await page.goto(tripPath);
  await signUp(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "Lisbon and Porto" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Edit" }).click();

  // A run before this one can have left the trip at another time. A time
  // that an older version has makes the history call the change a restore.
  // No other moment of the day has a time that is not a multiple of 5.
  const moment = page.getByRole("button", { name: /Metro to the hotel$/ });
  const before = (await moment.textContent())?.slice(0, 5) ?? "";
  let after = before;
  while (after === before) {
    const minutes = 10 * 60 + Math.floor(Math.random() * 10 * 60);
    if (minutes % 5 === 0) continue;
    after = `${String(Math.floor(minutes / 60))}:${String(minutes % 60).padStart(2, "0")}`;
  }
  await moment.click();
  await page.getByRole("textbox", { name: "Clock time" }).fill(after);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(moment).toContainText(after);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  // The reader names each time of the day in a heading.
  const time = (text: string) =>
    page.getByRole("heading", { level: 3, name: text, exact: true });
  // The reader with the change is now a page that the app keeps, which the
  // restore must not show again.
  await page.getByRole("button", { name: "Done" }).click();
  await expect(time(after)).toBeVisible();
  await page.getByRole("link", { name: "Edit" }).click();

  await page.getByRole("button", { name: /^Lisbon and Porto/ }).click();
  await page.getByRole("link", { name: "History" }).click();
  await expect(page).toHaveURL(new RegExp(`${tripPath}/history$`));
  const versions = page
    .getByRole("list", { name: "Versions" })
    .getByRole("listitem");
  await expect(versions.first()).toContainText("Current");
  await expect(versions.first()).toContainText("You");
  await expect(versions.first()).toContainText("Day 1: 1 changed");

  await versions.nth(1).getByRole("link").click();
  await page.getByRole("button", { name: "Restore this version" }).click();
  await expect(
    page.getByText(/The versions after it stay in the history\./),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore", exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`${tripPath}$`));
  await expect(time(before)).toBeVisible();
  await expect(time(after)).toHaveCount(0);
});
