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

const REPORT_API = /\/api\/finance\/reports(?:[/?]|$)/;
const SYNC_API = "**/api/finance/sync**";
const PERSIST_THROTTLE_MS = 1000;

function sameOrigin(page: Page) {
  return { Origin: new URL(page.url()).origin, Referer: page.url() };
}

/** Makes the Report of the week that ends on `periodEnd` through the API, as the page's Member, and returns its id. */
async function makeReport(page: Page, periodEnd: string) {
  const response = await page.request.post("/api/finance/reports/regenerate", {
    headers: sameOrigin(page),
    data: { periodEnd },
  });
  expect(response.status()).toBe(200);
  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null || !("id" in body)) {
    throw new Error("The regenerate response has no id");
  }
  return String(body.id);
}

/** The Reports this device stored for offline, one value for each Household. */
function storedReports(page: Page) {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const open = indexedDB.open("finance-reports");
        open.onupgradeneeded = () => {
          open.result.createObjectStore("queries");
        };
        open.onerror = () => {
          reject(new Error("The Reports store did not open"));
        };
        open.onsuccess = () => {
          const read = open.result
            .transaction("queries", "readonly")
            .objectStore("queries")
            .getAll();
          read.onerror = () => {
            reject(new Error("The Reports store did not read"));
          };
          read.onsuccess = () => {
            open.result.close();
            resolve(read.result.map(String));
          };
        };
      }),
  );
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

test.describe("Weekly reports without the server", () => {
  test.use({ viewport: DESKTOP, serviceWorkers: "block" });

  test("shows the stored list and reports offline, drops a deleted report at the next load, and keeps nothing after sign-out, not even from another tab", async ({
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
    await expect(weeks).toHaveCount(2, { timeout: SYNC_TIMEOUT });
    await expect(headline).toBeVisible({ timeout: SYNC_TIMEOUT });
    await weeks.nth(1).click();
    await expect(page).toHaveURL(`/finance/reports/${older}`);
    await expect(headline).toBeVisible({ timeout: SYNC_TIMEOUT });
    await expect
      .poll(async () => (await storedReports(page)).join(""))
      .toContain(`"report","${older}"`);

    await page.route(REPORT_API, (route) =>
      route.abort("internetdisconnected"),
    );
    await page.reload();
    await expect(weeks).toHaveCount(2);
    await expect(headline).toBeVisible();
    await expect(page.getByText("The reports did not load")).toBeHidden();

    await page.unroute(REPORT_API);
    const deleted = await page.request.delete(`/api/finance/reports/${older}`, {
      headers: sameOrigin(page),
    });
    expect(deleted.status()).toBe(204);
    await page.goto("/finance/reports");
    await expect(weeks).toHaveCount(1, { timeout: SYNC_TIMEOUT });
    await expect
      .poll(async () => (await storedReports(page)).join(""))
      .not.toContain(older);

    const other = await page.context().newPage();
    await other.route(SYNC_API, (route) => route.abort("internetdisconnected"));
    await other.goto("/finance/reports");
    const saveImage = other.getByRole("button", { name: "Save image" });
    await expect(saveImage).toBeVisible({ timeout: SYNC_TIMEOUT });

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/finance/sign-in");
    expect(await storedReports(page)).toEqual([]);

    await saveImage.click();
    await expect(
      toast(
        other,
        "The image could not be made. Try again when you are online.",
      ),
    ).toBeVisible();
    await other.waitForTimeout(PERSIST_THROTTLE_MS * 2);
    expect(await storedReports(other)).toEqual([]);
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
