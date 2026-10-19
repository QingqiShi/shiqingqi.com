import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import sharp from "sharp";
import { lastCompleteWeekEnd } from "../../src/finance/reports/last-complete-week-end.ts";
import { expect, test } from "./finance-test.ts";
import { makeReport } from "./make-report.ts";
import { DESKTOP, SYNC_TIMEOUT } from "./transactions-page.ts";

const copy = {
  en: { path: "", save: "Save image" },
  zh: { path: "/zh", save: "保存图片" },
};

async function saveImage(page: Page, label: string) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: label, exact: true }).click(),
  ]);
  const path = await download.path();
  return readFile(path);
}

test.describe("Report share image in WebKit", () => {
  test.use({ viewport: DESKTOP });

  test("draws a full-width PNG in each language", async ({
    page,
    household,
    cookieSession: _cookieSession,
  }) => {
    await page.goto("/finance/reports");
    const id = await makeReport(page, lastCompleteWeekEnd(household.today));

    for (const words of [copy.en, copy.zh]) {
      await page.goto(`${words.path}/finance/reports/${id}`);
      const save = page.getByRole("button", { name: words.save, exact: true });
      await expect(save).toBeVisible({ timeout: SYNC_TIMEOUT });

      const png = await saveImage(page, words.save);
      const { width, height } = await sharp(png).metadata();
      const { channels } = await sharp(png).stats();
      expect(width).toBe(1600);
      expect(height).toBeGreaterThan(800);
      expect(
        channels.some((channel) => channel.stdev > 10),
        "the image is not blank",
      ).toBe(true);
    }
  });
});
