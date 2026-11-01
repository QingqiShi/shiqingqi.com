import { expect, test } from "./helpers/test.ts";

test.describe("Movie and TV Show Browsing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/movie-database");
    // Wait for content to load
    await expect(page.getByRole("radio", { name: /^movies$/i })).toBeVisible();
  });

  test("should persist filters in URL and maintain across navigation", async ({
    page,
  }) => {
    // Start with a genre filter already present in the URL.
    await page.goto("/movie-database?genre=28");

    // Verify the genre filter is reflected in the UI.
    await expect(
      page.getByRole("button", { name: /genre.*\(1\)/i }),
    ).toBeVisible();

    // Change sort
    await page.getByRole("radio", { name: /^rating/i }).click();

    // Verify both filters are visible in UI (persisted)
    await expect(
      page.getByRole("button", { name: /genre.*\(1\)/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("radio", { name: /^rating, descending/i }),
    ).toBeVisible();

    // Reload page to test persistence
    await page.reload();

    // Verify filters maintained after reload
    await expect(
      page.getByRole("button", { name: /genre.*\(1\)/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("radio", { name: /^rating, descending/i }),
    ).toBeVisible();
  });

  test("should load more movies when scrolling to bottom", async ({ page }) => {
    // Cards are links wrapping a poster image. The grid is window-virtualized
    // (react-virtuoso with `useWindowScroll`): only a sliding window of cards is
    // mounted at any time, so neither the mounted card count nor the "last"
    // mounted card is a reliable signal — scrolling just remounts a different
    // window of the *same* page. The virtualization-proof signal that another
    // page actually loaded is the document growing taller as the new page is
    // appended to the list.
    const cards = page.getByRole("link").filter({ has: page.getByRole("img") });
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);

    // Let the initial load settle so the baseline height is stable before we
    // trigger load-more.
    await page.waitForLoadState("networkidle");

    const pageHeight = () =>
      page.evaluate(() => document.documentElement.scrollHeight);
    const initialHeight = await pageHeight();

    // Drive virtuoso's scroll-based `endReached` with a top-to-bottom sweep in
    // viewport-sized steps (a one-shot jump to `scrollHeight` pins the window at
    // the rendered bottom without registering as the incremental scroll it
    // needs). Re-sweep on each poll until the document has grown past its
    // settled height — the virtualization-proof signal that another page loaded.
    await expect
      .poll(
        async () => {
          await page.evaluate(async () => {
            const step = window.innerHeight;
            const end = document.documentElement.scrollHeight;
            for (let y = 0; y <= end; y += step) {
              window.scrollTo(0, y);
              await new Promise((resolve) =>
                requestAnimationFrame(() => {
                  resolve(null);
                }),
              );
            }
          });
          return pageHeight();
        },
        { timeout: 10000 },
      )
      .toBeGreaterThan(initialHeight);

    // The grid is still rendered after loading more.
    await expect(cards.first()).toBeVisible();
  });

  test("should navigate to movie and TV show detail pages from cards", async ({
    page,
  }) => {
    // Test movie card navigation (cards are links containing images)
    const cards = page.getByRole("link").filter({ has: page.getByRole("img") });
    await expect(cards.first()).toBeVisible();
    await cards.first().click();

    // Verify movie detail page loaded
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Navigate back to browse page with TV shows
    await page.goto("/movie-database?type=tv");

    // Test TV show card navigation
    await expect(cards.first()).toBeVisible();
    await cards.first().click();

    // Verify TV show detail page loaded
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
