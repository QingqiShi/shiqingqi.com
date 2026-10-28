import { test, expect } from "@playwright/test";

const FIGHT_CLUB_ID = "550";

test("should open the trailer sheet, display video, and close", async ({
  page,
}) => {
  await page.goto(`/en/movie-database/movie/${FIGHT_CLUB_ID}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByRole("button", { name: /play trailer/i }).click();
  const iframe = page.locator('iframe[src*="youtube.com/embed"]');
  await expect(iframe).toBeVisible();

  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(iframe).not.toBeVisible();
});
