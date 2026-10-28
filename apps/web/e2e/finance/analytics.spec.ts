import type { Page } from "@playwright/test";
import { expect, test } from "./finance-test.ts";
import { DESKTOP, SYNC_TIMEOUT, transactionRows } from "./transactions-page.ts";

/** Opens Analytics and waits until the Replica has filled the charts. */
async function openAnalytics(page: Page) {
  await page.goto("/finance/analytics");
  await expect(page.getByRole("region", { name: "By category" })).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });
  await expect(
    page.getByRole("img", { name: "Income and spending" }),
  ).toBeVisible();
}

function total(page: Page) {
  return page
    .getByRole("region", { name: "Spent" })
    .getByText(/^£[\d,]+\.\d\d$/)
    .first();
}

test.describe("Analytics at 1440 px", () => {
  test.use({ viewport: DESKTOP });

  test("a range chip changes the total, and a category opens its transactions", async ({
    page,
    session: _session,
  }) => {
    await openAnalytics(page);
    const thisMonth = page.getByRole("button", { name: "This month" });
    await expect(thisMonth).toHaveAttribute("aria-pressed", "true");
    const monthTotal = await total(page).textContent();

    await page.getByRole("button", { name: "12M" }).click();
    await expect(page).toHaveURL(/range=12M/);
    await expect(total(page)).not.toHaveText(monthTotal ?? "");

    const byCategory = page.getByRole("region", { name: "By category" });
    await byCategory.getByRole("button", { pressed: false }).first().click();

    const trend = page
      .getByRole("region")
      .filter({ hasText: "Category trend" });
    await trend.getByRole("link", { name: "Transactions" }).click();

    await page.waitForURL(/\/finance\/transactions\?.*category=/, {
      timeout: SYNC_TIMEOUT,
    });
    await expect(transactionRows(page).first()).toBeVisible();
  });
});
