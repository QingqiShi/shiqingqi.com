import type { Page } from "@playwright/test";
import { addDays } from "../src/finance/domain/dates/add-days.ts";
import { lastCompleteWeekEnd } from "../src/finance/reports/last-complete-week-end.ts";
import { expect, test, waitForServiceWorker } from "./finance-test.ts";
import { makeReport } from "./make-report.ts";
import { clickSignOut, DESKTOP, SYNC_TIMEOUT } from "./transactions-page.ts";

const MONEY = /^[−-]?£[\d,]+\.\d\d$/;

function minorOf(text: string | null) {
  const value = (text ?? "").replace(/[£,]/g, "").replace("−", "-");
  return Math.round(Number(value) * 100);
}

/** The paths of the Reports answers that the service worker keeps for offline use. */
function storedReports(page: Page) {
  return page.evaluate(async () => {
    const cache = await caches.open("finance-reports");
    const requests = await cache.keys();
    return requests.map((request) => new URL(request.url).pathname);
  });
}

function balanceSheetRow(page: Page, name: string) {
  return page
    .getByRole("table", { name: "Balance sheet" })
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name, exact: true }) });
}

test.describe("Weekly reports at 1440 px", () => {
  test.use({ viewport: DESKTOP });

  test("makes last week's report from the empty list, and its figures agree", async ({
    page,
    session: _session,
  }) => {
    await page.goto("/reports");
    await page
      .getByRole("button", { name: "Make last week's report" })
      .click({ timeout: SYNC_TIMEOUT });
    await page.waitForURL(/\/reports\/[^/]+$/, {
      timeout: SYNC_TIMEOUT,
    });

    const headline = page
      .getByRole("region", { name: "Net worth" })
      .getByText(MONEY)
      .first();
    await expect(headline).toBeVisible({ timeout: SYNC_TIMEOUT });
    const netWorth = minorOf(await headline.textContent());
    const cell = (name: string) =>
      balanceSheetRow(page, name).getByRole("cell").first();
    const changeCell = (name: string) =>
      balanceSheetRow(page, name).getByRole("cell").nth(1);
    expect(minorOf(await cell("Net worth").textContent())).toBe(netWorth);
    expect(
      minorOf(await cell("Assets").textContent()) +
        minorOf(await cell("Liabilities").textContent()),
    ).toBe(netWorth);

    const moves = page
      .getByRole("region", { name: "What moved" })
      .getByRole("listitem");
    let moved = 0;
    for (const move of await moves.all()) {
      const [name, value] = await move
        .locator(":scope > span:not([aria-hidden])")
        .allTextContents();
      expect(minorOf(await changeCell(name).textContent())).toBe(
        minorOf(value),
      );
      moved += minorOf(value);
    }
    const weekChange = await changeCell("Net worth").textContent();
    expect(moved).toBe(weekChange === "–" ? 0 : minorOf(weekChange));

    let groupNets = 0;
    for (const net of await page
      .getByRole("region", { name: "Net by group" })
      .getByRole("listitem")
      .all()) {
      const [, value] = await net
        .locator(":scope > span:not([aria-hidden])")
        .allTextContents();
      groupNets += minorOf(value);
    }
    expect(groupNets).toBe(netWorth);
  });
});

test.describe("Weekly reports without the server", () => {
  test.use({ viewport: DESKTOP });

  test("shows the last list and reports offline, and keeps nothing after sign-out", async ({
    page,
    household,
    session: _session,
  }) => {
    const lastWeek = lastCompleteWeekEnd(household.today);
    await makeReport(page, lastWeek);
    const older = await makeReport(page, addDays(lastWeek, -7));
    const weeks = page
      .getByRole("navigation", { name: "Reports" })
      .getByRole("link");
    const headline = page
      .getByRole("region", { name: "Net worth" })
      .getByText(MONEY)
      .first();

    await page.goto("/reports");
    await waitForServiceWorker(page);
    await page.reload();
    await expect(weeks).toHaveCount(2, { timeout: SYNC_TIMEOUT });
    await expect(headline).toBeVisible({ timeout: SYNC_TIMEOUT });
    await weeks.nth(1).click();
    await expect(page).toHaveURL(`/reports/${older}`);
    await expect(headline).toBeVisible({ timeout: SYNC_TIMEOUT });
    await expect
      .poll(() => storedReports(page))
      .toEqual(
        expect.arrayContaining(["/api/reports", `/api/reports/${older}`]),
      );

    await page.context().setOffline(true);
    await page.goto("/reports");
    await expect(weeks).toHaveCount(2);
    await expect(headline).toBeVisible();
    await weeks.nth(1).click();
    await expect(page).toHaveURL(`/reports/${older}`);
    await expect(headline).toBeVisible();
    await page.context().setOffline(false);

    await clickSignOut(page);
    await expect(page).toHaveURL("/sign-in");
    expect(await storedReports(page)).toEqual([]);
  });
});
