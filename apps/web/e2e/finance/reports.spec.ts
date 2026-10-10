import type { Page } from "@playwright/test";
import { addDays } from "../../src/finance/domain/dates/add-days.ts";
import { lastCompleteWeekEnd } from "../../src/finance/reports/last-complete-week-end.ts";
import { expect, test } from "./finance-test.ts";
import { DESKTOP, MOBILE, SYNC_TIMEOUT, toast } from "./transactions-page.ts";

const MONEY = /^[−-]?£[\d,]+\.\d\d$/;

function minorOf(text: string | null) {
  const value = (text ?? "").replace(/[£,]/g, "").replace("−", "-");
  return Math.round(Number(value) * 100);
}

/** Makes the Report of the week that ends on `periodEnd` through the API, as the page's Member. */
async function makeReport(page: Page, periodEnd: string) {
  const response = await page.request.post("/api/finance/reports/regenerate", {
    headers: { Origin: new URL(page.url()).origin, Referer: page.url() },
    data: { periodEnd },
  });
  expect(response.status()).toBe(200);
}

function balanceSheetRow(page: Page, name: string) {
  return page
    .getByRole("table", { name: "Balance sheet" })
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name, exact: true }) });
}

test.describe("Weekly reports at 1440 px", () => {
  test.use({ viewport: DESKTOP });

  test("makes last week's report from the empty list; its figures agree and the summary copies", async ({
    page,
    context,
    session: _session,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/finance/reports");
    await expect(page.getByText("No reports yet.")).toBeVisible({
      timeout: SYNC_TIMEOUT,
    });
    await page.getByRole("button", { name: "Make last week's report" }).click();
    await page.waitForURL(/\/finance\/reports\/[^/]+$/, {
      timeout: SYNC_TIMEOUT,
    });

    const headline = page
      .getByRole("region", { name: "Net worth" })
      .getByText(MONEY)
      .first();
    await expect(headline).toBeVisible({ timeout: SYNC_TIMEOUT });
    const netWorth = minorOf(await headline.textContent());
    const cell = (name: string) =>
      balanceSheetRow(page, name).getByRole("cell").last();
    expect(minorOf(await cell("Net worth").textContent())).toBe(netWorth);
    expect(
      minorOf(await cell("Assets").textContent()) +
        minorOf(await cell("Liabilities").textContent()),
    ).toBe(netWorth);

    const groups = page
      .getByRole("region", { name: "By group" })
      .getByRole("listitem");
    expect(await groups.count()).toBeGreaterThan(0);
    for (const group of await groups.all()) {
      const [name, value] = await group
        .locator("span")
        .allTextContents()
        .then((texts) => texts.slice(0, 2));
      expect(minorOf(await cell(name).textContent())).toBe(minorOf(value));
    }

    await page.getByRole("button", { name: "Copy summary" }).click();
    await expect(toast(page, "Summary copied.")).toBeVisible();
    const summary = await page.evaluate(() => navigator.clipboard.readText());
    const lines = summary.split("\n");
    expect(lines[0]).toMatch(/^Weekly report, /);
    expect(lines[1]).toBe(`Net worth ${(await headline.textContent()) ?? ""}`);
  });
});

test.describe("Weekly reports at 390 px", () => {
  test.use({ viewport: MOBILE });

  test("steps between weeks and fits the phone width", async ({
    page,
    household,
    session: _session,
  }) => {
    const lastWeek = lastCompleteWeekEnd(household.today);
    await makeReport(page, lastWeek);
    await makeReport(page, addDays(lastWeek, -7));

    await page.goto("/finance/reports");
    const newest = page.getByRole("link", { name: /Last week/ });
    await newest.click({ timeout: SYNC_TIMEOUT });
    await page.waitForURL(/\/finance\/reports\/[^/]+$/);
    const newestUrl = page.url();
    const title = page.getByRole("heading", { level: 1 });
    await expect(title).toBeVisible();
    const newestTitle = await title.textContent();
    await expect(
      page.getByRole("region", { name: "Net worth" }).getByText(MONEY).first(),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);

    await page.getByRole("link", { name: /^Week before: / }).click();
    await expect(page).not.toHaveURL(newestUrl);
    await expect(title).not.toHaveText(newestTitle ?? "");
    await page.getByRole("link", { name: /^Week after: / }).click();
    await expect(page).toHaveURL(newestUrl);
  });
});
