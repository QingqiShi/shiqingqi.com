import type { Page } from "@playwright/test";
import { expect, expectNoSidewaysScroll, test } from "./finance-test.ts";
import {
  DESKTOP,
  MOBILE,
  SYNC_TIMEOUT,
  transactionRows,
} from "./transactions-page.ts";

/** Opens Analytics and waits until the Replica has filled the charts. */
async function openAnalytics(page: Page, locale: "en" | "zh" = "en") {
  await page.goto(`${locale === "zh" ? "/zh" : ""}/finance/analytics`);
  await expect(
    page.getByRole("region", {
      name: locale === "zh" ? "按分类" : "By category",
    }),
  ).toBeVisible({ timeout: SYNC_TIMEOUT });
  await expect(
    page.getByRole("img", {
      name: locale === "zh" ? "收入与支出" : "Income and spending",
    }),
  ).toBeVisible();
}

function total(page: Page) {
  return page
    .getByRole("region", { name: "Spent" })
    .getByText(/^£[\d,]+\.\d\d$/)
    .first();
}

/** The x-axis labels of a bar chart: its lowest row of text. */
async function axisLabelBoxes(page: Page, chartName: string) {
  return page.getByRole("img", { name: chartName }).evaluate((svg) => {
    const texts = [...svg.querySelectorAll("text")];
    const bottom = Math.max(
      ...texts.map((text) => Number(text.getAttribute("y"))),
    );
    return texts
      .filter((text) => Number(text.getAttribute("y")) === bottom)
      .map((text) => {
        const box = text.getBoundingClientRect();
        return { label: text.textContent, left: box.left, right: box.right };
      })
      .sort((a, b) => a.left - b.left);
  });
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
    await expect(page.getByRole("button", { name: "12M" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(thisMonth).toHaveAttribute("aria-pressed", "false");
    await expect(page).toHaveURL(/range=12M/);
    await expect(total(page)).not.toHaveText(monthTotal ?? "");

    const byCategory = page.getByRole("region", { name: "By category" });
    await byCategory.getByRole("button", { pressed: false }).first().click();

    const trend = page
      .getByRole("region")
      .filter({ hasText: "Category trend" });
    await expect(trend.getByText("Lowest", { exact: true })).toBeVisible();
    await trend.getByRole("link", { name: "Transactions" }).click();

    await page.waitForURL(/\/finance\/transactions\?.*category=/, {
      timeout: SYNC_TIMEOUT,
    });
    await expect(transactionRows(page).first()).toBeVisible();
  });
});

test.describe("Analytics at 390 px", () => {
  test.use({ viewport: MOBILE });

  test("fits the phone width and keeps the day labels apart, in EN and ZH", async ({
    page,
    session: _session,
  }) => {
    await openAnalytics(page);
    await expectNoSidewaysScroll(page);

    await openAnalytics(page, "zh");
    await expectNoSidewaysScroll(page);
    for (const label of ["本月", "上月", "近 3 个月", "近 12 个月", "今年"]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }

    const boxes = await axisLabelBoxes(page, "收入与支出");
    expect(boxes.length).toBeGreaterThan(1);
    for (let at = 1; at < boxes.length; at++) {
      expect(boxes[at].left).toBeGreaterThan(boxes[at - 1].right);
    }
  });
});
