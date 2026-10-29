import type { Page } from "@playwright/test";
import { expect, test } from "./finance-test.ts";
import { DESKTOP, SYNC_TIMEOUT } from "./transactions-page.ts";

async function openNetWorth(page: Page) {
  await page.goto("/");
  // The skeleton shows the same heading. Only the loaded screen has this region.
  await expect(
    page.getByRole("region", { name: "Net worth today" }),
  ).toBeVisible({ timeout: SYNC_TIMEOUT });
}

test.describe("Net worth at 1440 px", () => {
  test.use({ viewport: DESKTOP });

  test("an account opens in the column after the list, a ledger entry opens in the column after it, and each closes back", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    await page.getByRole("link", { name: /^Alex Current Northbank/ }).click();
    await expect(page).toHaveURL(/[?&]account=/);
    const account = page.getByRole("region", { name: "Alex Current" });
    await expect(
      account.getByRole("heading", { level: 2, name: "Alex Current" }),
    ).toBeVisible();
    const ledger = account.getByRole("region", { name: "Ledger" });

    const entry = ledger.locator("a[href*='tx=']").first();
    await entry.click();
    await expect(page).toHaveURL(/[?&]tx=/);
    const transaction = page.getByRole("region", { name: "Transaction" });
    await expect(transaction.getByRole("form")).toBeVisible();
    await expect(account).toBeVisible();

    await transaction.getByRole("button", { name: "Close" }).click();
    await expect(page).not.toHaveURL(/[?&]tx=/);
    await expect(page).toHaveURL(/[?&]account=/);
    await expect(transaction).toHaveCount(0);

    await page.getByRole("link", { name: /Net worth today/ }).click();
    await expect(page).not.toHaveURL(/[?&]account=/);
    await expect(
      page
        .getByRole("region", { name: "Household" })
        .getByRole("region", { name: "Trend" }),
    ).toBeVisible();
  });
});
