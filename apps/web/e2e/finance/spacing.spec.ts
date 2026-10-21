import { expectSpacing } from "../helpers/expect-spacing.ts";
import { expect, test } from "./finance-test.ts";
import { DESKTOP, MOBILE, SYNC_TIMEOUT } from "./transactions-page.ts";

const SCREENS = [
  { path: "/finance", heading: "Net worth" },
  { path: "/finance/transactions", heading: "Transactions" },
  { path: "/finance/analytics", heading: "Analytics" },
  { path: "/finance/reports", heading: "Reports" },
  { path: "/finance/settings/categories", heading: "Categories" },
];

for (const viewport of [MOBILE, DESKTOP]) {
  test.describe(`Finance spacing at ${String(viewport.width)}px`, () => {
    test.use({ viewport });

    for (const screen of SCREENS) {
      test(screen.path, async ({ page, cookieSession: _cookieSession }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(screen.path);
        const main = page.locator("main");
        await expect(
          main.getByRole("heading", { name: screen.heading }).first(),
        ).toBeVisible({ timeout: SYNC_TIMEOUT });
        await expect(main.locator('[aria-busy="true"]')).toHaveCount(0, {
          timeout: SYNC_TIMEOUT,
        });
        await expectSpacing(page, ["main"], { textGaps: true });
      });
    }
  });
}
