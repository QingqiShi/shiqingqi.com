import type { Page } from "@playwright/test";
import { expect, test } from "./finance-test.ts";
import {
  DESKTOP,
  MOBILE,
  openTransactions,
  SYNC_TIMEOUT,
} from "./transactions-page.ts";

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: test.info().outputPath(`${name}.png`) });
}

/**
 * The page shells the service worker stored for offline use. The same cache
 * holds prefetched screens under `?_rsc=`, which a page load cannot use.
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
});

for (const viewport of [DESKTOP, MOBILE]) {
  test.describe(`offline at ${String(viewport.width)}`, () => {
    test.use({ viewport });

    test("opens every screen offline, also the ones never visited", async ({
      page,
      session: _session,
    }) => {
      await openTransactions(page);
      const hasWorker = await page.evaluate(() =>
        Promise.race([
          navigator.serviceWorker.ready.then(() => true),
          new Promise<boolean>((resolve) => {
            setTimeout(() => {
              resolve(false);
            }, 10_000);
          }),
        ]),
      );
      test.skip(
        !hasWorker,
        "The service worker runs in a production build only.",
      );
      await expect
        .poll(
          () =>
            page.evaluate(() => navigator.serviceWorker.controller !== null),
          { timeout: SYNC_TIMEOUT },
        )
        .toBe(true);
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
      await page.evaluate(() => {
        Object.assign(window, { financeSamePage: true });
      });

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
      expect(
        await page.evaluate(() => "financeSamePage" in window),
        "prefetched screens open offline without a page load",
      ).toBe(true);

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
