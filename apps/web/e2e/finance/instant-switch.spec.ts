import type { Page } from "@playwright/test";
import { expect, test } from "./finance-test.ts";
import { DESKTOP, MOBILE, openTransactions } from "./transactions-page.ts";

/** Next prefetches links in a production build only, like the service worker. */
function isProductionBuild(page: Page) {
  return page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker.ready.then(() => true),
      new Promise<boolean>((resolve) => {
        setTimeout(() => {
          resolve(false);
        }, 10_000);
      }),
    ]),
  );
}

/** The paths of the RSC requests that the page makes from now on. */
function recordScreenRequests(page: Page) {
  const paths: string[] = [];
  page.on("request", (request) => {
    if (request.headers().rsc === "1") {
      paths.push(new URL(request.url()).pathname);
    }
  });
  return paths;
}

for (const viewport of [DESKTOP, MOBILE]) {
  test.describe(`destination switch at ${String(viewport.width)}`, () => {
    test.use({ viewport });

    test("shows the next screen without asking the server", async ({
      page,
      session: _session,
    }) => {
      await openTransactions(page);
      test.skip(
        !(await isProductionBuild(page)),
        "Next prefetches links in a production build only.",
      );
      await page.waitForLoadState("networkidle");
      const requests = recordScreenRequests(page);
      const nav = page.getByRole("navigation", { name: "Finance" });

      await nav.getByRole("link", { name: "Analytics" }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: "Analytics" }),
      ).toBeVisible();
      await nav.getByRole("link", { name: "Settings" }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: "Settings" }),
      ).toBeVisible();

      expect(requests).not.toContain("/finance/analytics");
      expect(requests).not.toContain("/finance/settings");
    });
  });
}
