import type { Page } from "@playwright/test";
import { inArray, sql } from "drizzle-orm";
import { reports } from "../../src/finance/db/schema.ts";
import { addDays } from "../../src/finance/domain/dates/add-days.ts";
import { lastCompleteWeekEnd } from "../../src/finance/reports/last-complete-week-end.ts";
import {
  expect,
  expectNoSidewaysScroll,
  test,
  waitForServiceWorker,
} from "./finance-test.ts";
import { makeReport } from "./make-report.ts";
import {
  clickSignOut,
  DESKTOP,
  MOBILE,
  SYNC_TIMEOUT,
  toast,
} from "./transactions-page.ts";

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

    await page.getByRole("button", { name: "Copy summary" }).click();
    await expect(toast(page, "Summary copied.")).toBeVisible();
    const summary = await page.evaluate(() => navigator.clipboard.readText());
    const lines = summary.split("\n");
    expect(lines[0]).toMatch(/^Weekly report, /);
    expect(lines[1]).toBe(`Net worth ${(await headline.textContent()) ?? ""}`);
  });
});

test.describe("Weekly reports written again on the server", () => {
  test.use({ viewport: DESKTOP });

  test("shows the new content after a reload, for the open report and the week before", async ({
    page,
    household,
    financeDb,
    session: _session,
  }) => {
    const lastWeek = lastCompleteWeekEnd(household.today);
    const newest = await makeReport(page, lastWeek);
    const older = await makeReport(page, addDays(lastWeek, -7));
    const headline = page
      .getByRole("region", { name: "Net worth" })
      .getByText(MONEY)
      .first();

    await page.goto(`/finance/reports/${newest}`);
    await waitForServiceWorker(page);
    await page.reload();
    await expect(headline).toBeVisible({ timeout: SYNC_TIMEOUT });
    await expect(headline).not.toHaveText("£123,456.78");
    await expect
      .poll(() => storedReports(page))
      .toContain(`/api/finance/reports/${older}`);

    await financeDb
      .update(reports)
      .set({
        data: sql`jsonb_set(${reports.data}, '{balanceSheet,netWorthMinor}', '12345678')`,
        generatedAt: sql`now()`,
      })
      .where(inArray(reports.id, [newest, older]));
    await page.reload();

    await expect(headline).toHaveText("£123,456.78", {
      timeout: SYNC_TIMEOUT,
    });
    await page.getByRole("link", { name: /^Week before: / }).click();
    await expect(page).toHaveURL(`/finance/reports/${older}`);
    await expect(headline).toHaveText("£123,456.78");
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

    await page.goto("/finance/reports");
    await waitForServiceWorker(page);
    await page.reload();
    await expect(weeks).toHaveCount(2, { timeout: SYNC_TIMEOUT });
    await expect(headline).toBeVisible({ timeout: SYNC_TIMEOUT });
    await weeks.nth(1).click();
    await expect(page).toHaveURL(`/finance/reports/${older}`);
    await expect(headline).toBeVisible({ timeout: SYNC_TIMEOUT });
    await expect
      .poll(() => storedReports(page))
      .toEqual(
        expect.arrayContaining([
          "/api/finance/reports",
          `/api/finance/reports/${older}`,
        ]),
      );

    await page.context().setOffline(true);
    await page.goto("/finance/reports");
    await expect(weeks).toHaveCount(2);
    await expect(headline).toBeVisible();
    await expect(page.getByText("The reports did not load")).toBeHidden();
    await weeks.nth(1).click();
    await expect(page).toHaveURL(`/finance/reports/${older}`);
    await expect(headline).toBeVisible();
    await page.context().setOffline(false);

    await clickSignOut(page);
    await expect(page).toHaveURL("/finance/sign-in");
    expect(await storedReports(page)).toEqual([]);
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

    await expectNoSidewaysScroll(page);

    await page.getByRole("link", { name: /^Week before: / }).click();
    await expect(page).not.toHaveURL(newestUrl);
    await expect(title).not.toHaveText(newestTitle ?? "");
    await page.getByRole("link", { name: /^Week after: / }).click();
    await expect(page).toHaveURL(newestUrl);
  });
});
