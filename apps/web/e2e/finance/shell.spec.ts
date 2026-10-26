import type { Page } from "@playwright/test";
import { wheelPage } from "../helpers/scroll.ts";
import { findStatusBarCandidates } from "../helpers/status-bar.ts";
import { expect, test, waitForServiceWorker } from "./finance-test.ts";
import {
  DESKTOP,
  MOBILE,
  openTransactions,
  SYNC_TIMEOUT,
  transactionRows,
} from "./transactions-page.ts";

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: test.info().outputPath(`${name}.png`) });
}

/**
 * The page shells the service worker stored for offline use. The same cache
 * holds the data of visited screens under `?_rsc=`, which a page load cannot
 * use.
 */
function storedFinancePages(page: Page) {
  return page.evaluate(async () => {
    if (!("caches" in window)) return [];
    const cache = await caches.open("finance-pages");
    return (await cache.keys())
      .map((request) => new URL(request.url))
      .filter((url) => url.search === "")
      .map((url) => url.pathname);
  });
}

test.describe("tab bar below md", () => {
  test.use({ viewport: MOBILE });

  for (const locale of ["en", "zh"] as const) {
    test(`switches screens in one tap and keeps Add above it (${locale})`, async ({
      page,
      session: _session,
    }) => {
      const prefix = locale === "zh" ? "/zh" : "";
      await openTransactions(page, `${prefix}/finance/transactions`);
      const bar = page.getByRole("navigation", {
        name: locale === "zh" ? "家庭账本" : "Finance",
      });
      await expect(bar).toBeVisible();
      await expect(bar.getByRole("link")).toHaveCount(5);
      await screenshot(page, `tab-bar-transactions-390-${locale}`);

      const add = page.getByRole("link", {
        name: locale === "zh" ? "记一笔" : "Add",
        exact: true,
      });
      const addBox = await add.boundingBox();
      const barBox = await bar.boundingBox();
      expect(addBox && barBox && addBox.y + addBox.height).toBeLessThanOrEqual(
        barBox?.y ?? 0,
      );

      const analytics = bar.getByRole("link", {
        name: locale === "zh" ? "分析" : "Analytics",
      });
      await analytics.click();
      await expect(page).toHaveURL(`${prefix}/finance/analytics`);
      await expect(analytics).toHaveAttribute("aria-current", "page");
      await screenshot(page, `tab-bar-analytics-390-${locale}`);
    });
  }

  // Safari on iOS shows the page under its status bar only where the page
  // scrolls. Where nothing is under the status bar, as when the page bounces
  // at its top, it fills it with the document background.
  // The first content of each screen, and what shows once its data is in.
  for (const { path, top, ready } of [
    {
      path: "/finance",
      top: (page: Page) => page.getByRole("heading", { level: 1 }),
      ready: (page: Page) =>
        page.getByRole("link", { name: /^Alex Current Northbank/ }),
    },
    {
      path: "/finance/transactions",
      top: (page: Page) => page.getByRole("heading", { level: 1 }),
      ready: (page: Page) => transactionRows(page).first(),
    },
    {
      path: "/finance/analytics",
      top: (page: Page) => page.getByRole("heading", { level: 1 }),
      ready: (page: Page) => page.getByRole("heading", { name: "By category" }),
    },
    {
      path: "/finance/settings/categories",
      top: (page: Page) =>
        page.getByRole("heading", { level: 2, name: "Categories" }),
      ready: (page: Page) =>
        page.getByRole("heading", { level: 2, name: "Categories" }),
    },
  ]) {
    test(`scrolls the page under the status bar on ${path}`, async ({
      page,
      cookieSession: _cookieSession,
    }) => {
      await page.goto(path);
      await expect(
        page.getByRole("navigation", { name: "Finance" }),
      ).toBeVisible();
      const heading = top(page);
      await expect(heading).toBeVisible();
      await expect(ready(page)).toBeVisible();
      const fills = await page.evaluate(() => {
        let fill = "rgba(0, 0, 0, 0)";
        for (
          let element = document.elementFromPoint(innerWidth / 2, 4);
          element && fill === "rgba(0, 0, 0, 0)";
          element = element.parentElement
        ) {
          fill = getComputedStyle(element).backgroundColor;
        }
        return {
          document: getComputedStyle(document.documentElement).backgroundColor,
          top: fill,
        };
      });
      expect(fills.document).toBe(fills.top);

      await wheelPage(page, 400);
      await expect
        .poll(async () => (await heading.boundingBox())?.y ?? 0)
        .toBeLessThan(0);
      expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);
    });
  }
});

for (const viewport of [DESKTOP, MOBILE]) {
  test.describe(`offline at ${String(viewport.width)}`, () => {
    test.use({ viewport });

    test("opens every screen offline, also the ones never visited", async ({
      page,
      session: _session,
    }) => {
      await openTransactions(page);
      await waitForServiceWorker(page);
      await expect
        .poll(() => storedFinancePages(page), { timeout: SYNC_TIMEOUT })
        .toEqual(
          expect.arrayContaining([
            "/finance",
            "/finance/analytics",
            "/finance/reports",
            "/finance/settings",
            "/finance/settings/categories",
          ]),
        );

      await page.context().setOffline(true);
      const rail = page.getByRole("navigation", { name: "Finance" });
      await expect(rail).toBeVisible();

      await rail.getByRole("link", { name: "Analytics" }).click();
      await expect(page).toHaveURL("/finance/analytics");
      await expect(
        page.getByRole("heading", { level: 1, name: "Analytics" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "By category" }),
      ).toBeVisible();
      await screenshot(page, `offline-analytics-${String(viewport.width)}-en`);

      await rail.getByRole("link", { name: "Reports" }).click();
      await expect(page).toHaveURL("/finance/reports");
      await expect(rail.getByRole("link", { name: "Reports" })).toHaveAttribute(
        "aria-current",
        "page",
      );

      await page.goto("/finance/settings/categories");
      await expect(page.getByText("食品").first()).toBeVisible();

      await page.goto("/finance");
      await expect(
        page.getByRole("heading", { level: 1, name: "Net worth" }),
      ).toBeVisible();
    });
  });
}

test.describe("first download", () => {
  test.use({ viewport: MOBILE, serviceWorkers: "block" });

  test("says when the download fails, and Try again gets the data", async ({
    page,
    session: _session,
  }) => {
    await openTransactions(page);
    await page.route(/\/api\/finance\/sync\?since=0/, (route) =>
      route.fulfill({ status: 500, body: "" }),
    );
    await page.evaluate(async () => {
      for (const db of await indexedDB.databases()) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    });
    await page.reload();

    const heading = page.getByRole("heading", {
      name: "Couldn't download your data",
    });
    await expect(heading).toBeVisible({ timeout: SYNC_TIMEOUT });
    await screenshot(page, "download-failed-390-en");

    await page.unroute(/\/api\/finance\/sync\?since=0/);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(heading).toBeHidden({ timeout: SYNC_TIMEOUT });
    await expect(
      page.getByRole("textbox", { name: "Quick add" }),
    ).toBeVisible();
  });

  test("says that it waits for the network when the device is offline", async ({
    page,
    session: _session,
  }) => {
    await openTransactions(page);
    await page.route(/\/api\/finance\/sync/, (route) =>
      route.abort("internetdisconnected"),
    );
    await page.evaluate(async () => {
      for (const db of await indexedDB.databases()) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    });
    await page.reload();
    await page.context().setOffline(true);

    const heading = page.getByRole("heading", { name: "You're offline" });
    await expect(heading).toBeVisible();
    await screenshot(page, "download-offline-390-en");

    await page.unroute(/\/api\/finance\/sync/);
    await page.context().setOffline(false);
    await expect(heading).toBeHidden({ timeout: SYNC_TIMEOUT });
    await expect(
      page.getByRole("textbox", { name: "Quick add" }),
    ).toBeVisible();
  });
});
