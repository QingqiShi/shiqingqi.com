import type { Page } from "@playwright/test";
import { expect, expectNoSidewaysScroll, test } from "./finance-test.ts";
import { DESKTOP, MOBILE } from "./transactions-page.ts";

async function openNetWorth(page: Page, locale: "en" | "zh" = "en") {
  await page.goto(locale === "zh" ? "/zh/finance" : "/finance");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: locale === "zh" ? "净资产" : "Net worth",
    }),
  ).toBeVisible();
}

test.describe("Net worth at 1440 px", () => {
  test.use({ viewport: DESKTOP });

  test("the headline shows today's net worth with its changes, and the trend chart fills the pane", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    const headline = page.getByRole("region", { name: "Net worth today" });
    await expect(headline).toContainText(/£[\d,]+\.\d\d/);
    await expect(headline.getByText("vs last week")).toBeVisible();
    await expect(headline.getByText("since 1 Jan")).toBeVisible();
    await expect(headline.getByText("Assets")).toBeVisible();
    await expect(headline.getByText("Liabilities")).toBeVisible();

    const pane = page.getByRole("complementary", { name: "Account" });
    await expect(
      pane.getByRole("group", { name: /^Net worth\. Use the arrow keys/ }),
    ).toBeVisible();
    const yearChip = pane.getByRole("radio", { name: "1Y" });
    await yearChip.click();
    await expect(yearChip).toBeChecked();
  });

  test("an account opens beside the list with its ledger and balances after each line", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    await page.getByRole("link", { name: /^Alex Current/ }).click();
    await expect(page).toHaveURL(/[?&]account=/);
    const pane = page.getByRole("complementary", { name: "Account" });
    await expect(
      pane.getByRole("heading", { level: 2, name: "Alex Current" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^Alex Current/ }),
    ).toHaveAttribute("aria-current", "true");
    const ledger = pane.getByRole("region", { name: "Ledger" });
    await expect(ledger.getByText("Balance after:").first()).toBeAttached();
    await expect(
      ledger.getByRole("link", { name: "All transactions on this account" }),
    ).toBeVisible();
  });
});

test.describe("Net worth at 390 px", () => {
  test.use({ viewport: MOBILE });

  test("in Chinese the headline, range chips and chart fit the screen", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page, "zh");
    const headline = page.getByRole("region", { name: "今日净资产" });
    await expect(headline.getByText("较上周")).toBeVisible();
    await expect(headline.getByText("今年以来")).toBeVisible();
    await expect(page.getByRole("radio", { name: "6 个月" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "1 个月" })).toBeVisible();
    await expectNoSidewaysScroll(page);
  });

  test("an account opens on its own page and leads back to Net worth", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    await page.getByRole("link", { name: /^Family Home/ }).click();
    await expect(page).toHaveURL(/\/finance\/accounts\/[0-9a-f-]+$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Family Home" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ledger" })).toBeVisible();
    await expectNoSidewaysScroll(page);
    await page.getByRole("link", { name: "Net worth" }).first().click();
    await expect(page).toHaveURL(/\/finance$/, { timeout: 30_000 });
  });
});
