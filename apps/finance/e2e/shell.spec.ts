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

test.describe("switching tabs", () => {
  // The service worker answers the data of a screen, so a route in the page
  // does not see that request.
  test.use({ viewport: DESKTOP, serviceWorkers: "block" });

  test("a tab whose screen waits on the server is current at once and shows its skeleton", async ({
    page,
    session: _session,
  }) => {
    await openTransactions(page);
    await page.route("**/analytics?_rsc=*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    const rail = page.getByRole("navigation", { name: "Finance" });
    const analytics = rail.getByRole("link", { name: "Analytics" });
    await analytics.click();

    await expect(analytics).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("main").locator('[aria-busy="true"]').first(),
    ).toBeVisible();
    await expect(page).toHaveURL("/transactions");

    await expect(page).toHaveURL("/analytics");
    await expect(
      page.getByRole("heading", { name: "By category" }),
    ).toBeVisible();
  });
});

test.describe("the rail", () => {
  test.use({ viewport: DESKTOP });

  // Safari on an iPad collapses its bar while the page scrolls, and it changes
  // `dvh` only after that motion ends. Until then, the rail is shorter than
  // the screen, and a member at its bottom edge goes up with it, then jumps
  // back down.
  test("the member stays at the bottom of the screen while the rail is shorter than the screen", async ({
    page,
    session: _session,
  }) => {
    await page.goto("/settings");
    const member = page.getByRole("button", { name: /^Signed in as/ });
    await expect(member).toBeVisible();
    const bottomOfMember = async () => {
      const box = await member.boundingBox();
      return box === null ? null : box.y + box.height;
    };
    const atRest = await bottomOfMember();

    const railHeight = await page
      .getByRole("navigation", { name: "Finance" })
      .evaluate((nav) => {
        let rail: HTMLElement | null = nav.parentElement;
        while (rail !== null && getComputedStyle(rail).position !== "sticky") {
          rail = rail.parentElement;
        }
        if (rail === null) return null;
        rail.style.blockSize = "calc(100dvh - 80px)";
        return rail.getBoundingClientRect().height;
      });

    expect(railHeight).toBe(DESKTOP.height - 80);
    expect(await bottomOfMember()).toBe(atRest);
  });
});

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
