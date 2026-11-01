import type { Page } from "@playwright/test";
import { expect, test } from "./helpers/test.ts";

function canvasColour(page: Page) {
  return page.evaluate(
    () => getComputedStyle(document.documentElement).backgroundColor,
  );
}

test("a manual theme choice applies and persists across browser sessions", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const light = await canvasColour(page);

  await page.getByRole("button", { name: /switch to dark theme/i }).click();
  await expect(
    page.getByRole("button", { name: /switch to light theme/i }),
  ).toBeVisible();
  await expect.poll(() => canvasColour(page)).not.toBe(light);
  const dark = await canvasColour(page);

  const newPage = await context.newPage();
  await newPage.goto("/");
  await expect(newPage.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    newPage.getByRole("button", { name: /switch to light theme/i }),
  ).toBeVisible();
  expect(await canvasColour(newPage)).toBe(dark);
  await newPage.close();
});
