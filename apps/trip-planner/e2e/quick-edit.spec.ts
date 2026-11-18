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

test("an owner renames a trip on the reader, takes it back with Undo, and finds it as it was after a reload and through an old edit link", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await signUp(page);
  await expect(page).toHaveURL(/\/$/);
  const tripId = await makeTrip(page);
  await page.goto(`/${tripId}`);
  const title = (name: string) =>
    page.getByRole("heading", { level: 1, name, exact: true });
  await expect(title("Kyoto in autumn")).toBeVisible();

  await page.getByRole("button", { name: "Trip details" }).first().click();
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Kyoto and Nara");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(title("Kyoto and Nara")).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Change taken back")).toBeVisible();
  await expect(title("Kyoto in autumn")).toBeVisible();

  await page.reload();
  await expect(title("Kyoto in autumn")).toBeVisible();

  // The edit screen is gone. An old link to it opens the reader.
  await page.goto(`/${tripId}/edit#day-2`);
  await expect(page).toHaveURL(new RegExp(`/${tripId}#day-2$`));
  await expect(title("Kyoto in autumn")).toBeVisible();
});
