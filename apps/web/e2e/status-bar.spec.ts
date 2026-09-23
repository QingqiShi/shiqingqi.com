import { test, expect } from "@playwright/test";
import { findStatusBarCandidates } from "./helpers/status-bar.ts";

test("should flag a viewport-sized fixed canvas element", async ({ page }) => {
  await page.setContent(`
    <body style="margin: 0">
      <canvas style="position: fixed; inset: 0; width: 100vw; height: 100vh"></canvas>
    </body>
  `);
  expect(await page.evaluate(findStatusBarCandidates)).toEqual(["canvas"]);
});

for (const { name, path } of [
  { name: "home page", path: "/" },
  {
    name: "design-system page",
    path: "/en/design-system/components/sticky-controls",
  },
]) {
  test(`should keep every fixed box on the ${name} out of the status bar`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);

    // Safari on iOS keeps sampling the top edge after a scroll.
    await page.mouse.wheel(0, 400);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0);
    expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);
  });
}
