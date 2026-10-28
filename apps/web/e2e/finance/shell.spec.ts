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
      page.getByRole("heading", { name: "By category" }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Reports" }).click();
    await expect(page).toHaveURL("/finance/reports");

    await page.goto("/finance/settings/categories");
    await expect(
      page.getByRole("heading", { level: 2, name: "Categories" }),
    ).toBeVisible();

    await page.goto("/finance");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

// The cover screen of a foldable iPhone, which shows its status bar in a
// column at the right side.
const SIDE_STATUS_BAR = { width: 466, height: 678 };
const SIDE_INSET = 84;

async function emulateSideInset(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setSafeAreaInsetsOverride", {
    insets: { right: SIDE_INSET },
  });
}

/**
 * Shows the page as an app opened from the Home Screen. Chromium cannot
 * emulate `display-mode`, so the styles of the page apply their
 * `display-mode: standalone` rules everywhere, the service worker included.
 */
async function openAsApp(page: Page) {
  await page.context().route(/\.css(\?|$)/, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replaceAll(
      /\(display-mode:\s*standalone\)/g,
      "all",
    );
    await route.fulfill({ response, body });
  });
}

test.describe("status bar at the side of a 466 px screen", () => {
  test.use({ viewport: SIDE_STATUS_BAR });

  const trendOf = (page: Page) =>
    page.getByRole("group", { name: /^Net worth\. Use the arrow keys/ });
  const addOf = (page: Page) =>
    page.getByRole("link", { name: "Add", exact: true });

  test("in the app, Add sits in the safe area at the side, level with the tab bar, and the trend reaches the screen edge", async ({
    page,
    session: _session,
  }) => {
    await emulateSideInset(page);
    await openAsApp(page);
    const bar = page.getByRole("navigation", { name: "Finance" });
    const add = addOf(page);
    const expectAddInTheSide = async () => {
      const addBox = await add.boundingBox();
      const barBox = await bar.boundingBox();
      expect(addBox).not.toBeNull();
      expect(barBox).not.toBeNull();
      if (addBox === null || barBox === null) return;
      expect(addBox.x).toBeGreaterThanOrEqual(
        SIDE_STATUS_BAR.width - SIDE_INSET,
      );
      expect(addBox.x + addBox.width / 2).toBeCloseTo(
        SIDE_STATUS_BAR.width - SIDE_INSET / 2,
        0,
      );
      expect(addBox.y + addBox.height).toBeCloseTo(barBox.y + barBox.height, 0);
    };

    await page.goto("/finance");
    const trend = trendOf(page);
    await expect(trend).toBeVisible({ timeout: SYNC_TIMEOUT });
    await expectAddInTheSide();
    const trendBox = await trend.boundingBox();
    expect((trendBox?.x ?? 0) + (trendBox?.width ?? 0)).toBeCloseTo(
      SIDE_STATUS_BAR.width,
      0,
    );

    await openTransactions(page);
    await expectAddInTheSide();
  });

  // Safari puts its tab controls at the bottom of the side column.
  test("in a browser tab, Add floats above the tab bar, clear of the side column", async ({
    page,
    session: _session,
  }) => {
    await emulateSideInset(page);
    const bar = page.getByRole("navigation", { name: "Finance" });
    const add = addOf(page);
    const expectAddFloating = async () => {
      const addBox = await add.boundingBox();
      const barBox = await bar.boundingBox();
      expect(addBox).not.toBeNull();
      expect(barBox).not.toBeNull();
      if (addBox === null || barBox === null) return;
      expect(addBox.x + addBox.width).toBeLessThanOrEqual(
        SIDE_STATUS_BAR.width - SIDE_INSET,
      );
      expect(addBox.y + addBox.height).toBeLessThanOrEqual(barBox.y);
    };

    await page.goto("/finance");
    await expect(trendOf(page)).toBeVisible({ timeout: SYNC_TIMEOUT });
    await expectAddFloating();

    await openTransactions(page);
    await expectAddFloating();
  });
});
