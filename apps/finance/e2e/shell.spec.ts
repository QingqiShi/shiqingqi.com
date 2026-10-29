import type { Page } from "@playwright/test";
import { expect, test, waitForServiceWorker } from "./finance-test.ts";
import {
  DESKTOP,
  openTransactions,
  SYNC_TIMEOUT,
} from "./transactions-page.ts";

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

test.describe("offline", () => {
  test.use({ viewport: DESKTOP });

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
          "/",
          "/analytics",
          "/reports",
          "/settings",
          "/settings/categories",
        ]),
      );

    await page.context().setOffline(true);
    const rail = page.getByRole("navigation", { name: "Finance" });
    await expect(rail).toBeVisible();

    await rail.getByRole("link", { name: "Analytics" }).click();
    await expect(page).toHaveURL("/analytics");
    await expect(
      page.getByRole("heading", { name: "By category" }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Reports" }).click();
    await expect(page).toHaveURL("/reports");

    await page.goto("/settings/categories");
    await expect(
      page.getByRole("heading", { level: 2, name: "Categories" }),
    ).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
