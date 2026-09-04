import { test, expect, type Locator } from "@playwright/test";

/**
 * A MenuButton popup's box once its entrance has settled.
 *
 * The popup itself no longer moves — a separate surface morphs out of the
 * trigger — but one popup on the filters bar still rides the hero morph that
 * shifts the trigger's wrapper as the hero input scrolls away, so a box read on
 * arrival can describe an animation frame rather than what CSS anchored the
 * popup to. Waiting for every finite animation and transition to finish leaves
 * exactly the computed geometry. The infinite ones are skeleton shimmers, which
 * never finish and never move a popup.
 */
async function settledPopupBox(popup: Locator) {
  await expect(popup).toBeVisible();

  return popup.evaluate(async (element) => {
    await Promise.allSettled(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished),
    );

    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  });
}

test.describe("Movie and TV Show Browsing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/movie-database");
    // Wait for content to load
    await expect(page.getByRole("radio", { name: /^movies$/i })).toBeVisible();
  });

  test("should display movie grid with filter controls by default", async ({
    page,
  }) => {
    // Verify "Movies" toggle radio is visible
    const moviesRadio = page.getByRole("radio", { name: /^movies$/i });
    await expect(moviesRadio).toBeVisible();

    // Verify at least one movie card is visible.
    // The grid is virtualized, so the number of mounted cards varies with the
    // available viewport height and surrounding content.
    const cards = page.getByRole("link").filter({ has: page.getByRole("img") });
    await expect(cards.first()).toBeVisible();

    // Verify media type toggle radios
    await expect(
      page.getByRole("radio", { name: /^tv shows$/i }),
    ).toBeVisible();

    // Verify genre filter button
    await expect(page.getByRole("button", { name: /^genre/i })).toBeVisible();

    // Verify sort segments (Popularity and Rating)
    await expect(
      page.getByRole("radio", { name: /^popularity/i }),
    ).toBeVisible();
    await expect(page.getByRole("radio", { name: /^rating/i })).toBeVisible();
  });

  test("should toggle between movies and TV shows", async ({ page }) => {
    // Wait for movie cards (cards are links containing images)
    const mediaCards = page
      .getByRole("link")
      .filter({ has: page.getByRole("img") });
    await expect(mediaCards.first()).toBeVisible();

    // Click "TV Shows" radio
    await page.getByRole("radio", { name: /^tv shows$/i }).click();

    // Wait for TV show cards to appear
    await expect(mediaCards.first()).toBeVisible({ timeout: 15000 });

    // Click "Movies" radio to switch back
    await page.getByRole("radio", { name: /^movies$/i }).click();

    // Wait for movie cards again
    await expect(mediaCards.first()).toBeVisible();
  });

  test("should filter by single and multiple genres with ALL/ANY toggle", async ({
    page,
  }) => {
    // A single selected genre should be reflected in the UI.
    await page.goto("/movie-database?genre=28");
    await expect(
      page.getByRole("button", { name: /genre.*\(1\)/i }),
    ).toBeVisible();

    // Multiple selected genres should also be reflected in the UI.
    await page.goto("/movie-database?genre=28&genre=12");
    await expect(
      page.getByRole("button", { name: /genre.*\(2\)/i }),
    ).toBeVisible();

    // With multiple genres selected, the ALL/ANY toggle should be available.
    await page.getByRole("button", { name: /genre.*\(2\)/i }).click();
    await expect(
      page.getByRole("radio", { name: /any selected/i }),
    ).toBeVisible();
  });

  test("should toggle between popularity and rating sort", async ({ page }) => {
    // Click the Rating sort segment
    await page.getByRole("radio", { name: /^rating/i }).click();

    // Verify rating link is now active (descending)
    await expect(
      page.getByRole("radio", { name: /^rating, descending/i }),
    ).toBeVisible();

    // Click popularity to switch back
    await page.getByRole("radio", { name: /^popularity/i }).click();

    // Verify popularity is now active (descending)
    await expect(
      page.getByRole("radio", { name: /^popularity, descending/i }),
    ).toBeVisible();
  });

  test("should show and apply reset button when filters are active", async ({
    page,
  }) => {
    // Start with an active genre filter via the URL and verify the UI reflects it.
    await page.goto("/movie-database?genre=28");
    await expect(
      page.getByRole("button", { name: /genre.*\(1\)/i }),
    ).toBeVisible();

    // Change sort to rating
    await page.getByRole("radio", { name: /^rating/i }).click();

    // Verify rating is active (descending)
    await expect(
      page.getByRole("radio", { name: /^rating, descending/i }),
    ).toBeVisible();

    // Verify reset button is visible
    await expect(page.getByRole("link", { name: /reset/i })).toBeVisible();

    // Click reset button
    await page.getByRole("link", { name: /reset/i }).click();

    // Verify filters are cleared (genre button back to no count, popularity active)
    await expect(page.getByRole("button", { name: /^genre$/i })).toBeVisible();
    await expect(
      page.getByRole("radio", { name: /^popularity, descending/i }),
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

  test("should load page with filters from URL parameters", async ({
    page,
  }) => {
    // Navigate with filter parameters (genre 18 = Drama, works for both movies and TV)
    await page.goto("/movie-database?type=tv&genre=18&sort=vote_average.desc");

    // Verify media cards appear (confirms URL filters were applied)
    const cards = page.getByRole("link").filter({ has: page.getByRole("img") });
    await expect(cards.first()).toBeVisible();

    // Verify genre and sort are active in UI
    await expect(
      page.getByRole("button", { name: /genre.*\(1\)/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("radio", { name: /^rating, descending/i }),
    ).toBeVisible();
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

  test.describe("Bilingual Support", () => {
    test("should display English UI labels and genre names", async ({
      page,
    }) => {
      await page.goto("/movie-database");

      // Verify English labels
      await expect(
        page.getByRole("radio", { name: "Movies", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("radio", { name: "TV Shows", exact: true }),
      ).toBeVisible();

      // Open genre menu and verify English genre names
      await page.getByRole("button", { name: /^genre/i }).click();
      await expect(page.getByRole("link", { name: /^action$/i })).toBeVisible();
    });

    test("should display Chinese UI labels and genre names", async ({
      page,
    }) => {
      await page.goto("/zh/movie-database");

      // Verify Chinese labels - use first() to avoid strict mode violation
      await expect(
        page.getByRole("radio", { name: "电影" }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("radio", { name: "电视剧", exact: true }),
      ).toBeVisible();

      // Open genre menu and verify Chinese genre names
      await page.getByRole("button", { name: /类型/i }).click();
      await expect(page.getByRole("link", { name: "动作" })).toBeVisible();
    });

    test("should maintain language when navigating from cards", async ({
      page,
    }) => {
      await page.goto("/zh/movie-database");

      // Cards are links containing images
      const cards = page
        .getByRole("link")
        .filter({ has: page.getByRole("img") });
      await expect(cards.first()).toBeVisible();
      await cards.first().click();

      // Verify detail page loaded with Chinese UI (movie title appears)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  });
});

// Below `md` the filters collapse into a single Refine trigger that opens a
// bar-wide sheet. Where the sheet lands, how tall it is allowed to be, and the
// backdrop that dismisses it all depend on real layout, so they can only be
// checked in a browser at a phone viewport.
test.describe("Mobile filters sheet", () => {
  const viewport = { width: 393, height: 852 };
  test.use({ viewport });

  const refineName = /^refine/i;

  /**
   * Scrolls so the filters bar renders `barTop` down the viewport. Passing a
   * value above its sticky offset leaves the bar stuck at that offset instead.
   * At the top of the page the bar is below the fold and therefore unstuck, so
   * its rect there is its natural document offset.
   */
  async function scrollBarTo(refine: Locator, barTop: number) {
    // One round trip: reading the natural offset and scrolling by it separately
    // leaves a window in which layout can shift between the two.
    await refine.evaluate((el, top) => {
      window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - top);
    }, barTop);
    await expect(refine).toBeInViewport();
  }

  test("opens inside the viewport and closes on a tap behind it", async ({
    page,
  }) => {
    await page.goto("/movie-database");

    // Drive the bar past its sticky offset, the state it spends most of its life
    // in. The sheet's anchoring has to survive both the scroll and the pinning.
    const refine = page.getByRole("button", { name: refineName });
    await scrollBarTo(refine, 0);
    await refine.click();

    const box = await settledPopupBox(
      page.getByRole("group", { name: refineName }),
    );

    // The sheet spans the filters bar and stays inside the viewport. Anchoring
    // it to the trigger's corner hung most of it off the inline-start edge, and
    // a compositing layer on the trigger's wrapper collapsed it onto the button.
    expect(box.width).toBeGreaterThan(viewport.width * 0.8);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

    // A tap outside the sheet has to be intercepted, not passed through to the
    // page — on a phone there is no Escape key and no close button, so that
    // interception is the only way out. Check what is actually topmost at the
    // tap point first: Chromium also closes the menu on blur, which would mask
    // a backdrop shrunk back to the trigger's box, and iOS Safari has no such
    // fallback because tapping a button there never focuses it.
    const outsideX = viewport.width / 2;
    const outsideY = (box.y + box.height + viewport.height) / 2;
    expect(outsideY).toBeGreaterThan(box.y + box.height);
    const topmost = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.getAttribute("aria-hidden"),
      [outsideX, outsideY],
    );
    expect(topmost).toBe("true");

    await page.mouse.click(outsideX, outsideY);

    await expect(refine).toHaveAttribute("aria-expanded", "false");
    // The tap dismissed the sheet rather than reaching whatever sat under it.
    await expect(page).toHaveURL(/\/movie-database$/);
  });

  test("stays inside the viewport when the bar has not stuck yet", async ({
    page,
  }) => {
    await page.goto("/movie-database");

    // Let the page settle first: content still arriving above the bar shifts it
    // after a scroll, which would move the bar out of the state under test.
    const cards = page.getByRole("link").filter({ has: page.getByRole("img") });
    await expect(cards.first()).toBeVisible();
    await page.waitForLoadState("networkidle");

    // Halfway down the viewport the bar is still short of its sticky offset, so
    // there is far less room beneath it than once it pins. A sheet whose height
    // cap assumed the stuck offset ran off the bottom of the screen here.
    const refine = page.getByRole("button", { name: refineName });
    await scrollBarTo(refine, viewport.height / 2);
    await refine.click();

    const box = await settledPopupBox(
      page.getByRole("group", { name: refineName }),
    );

    // Read the bar after the sheet has settled, so both describe the same
    // moment, and guard the premise — this only tests anything while unstuck.
    const triggerBox = await refine.boundingBox();
    if (!triggerBox) throw new Error("expected the trigger to have a box");
    expect(triggerBox.y).toBeGreaterThan(viewport.height / 4);

    expect(box.y).toBeGreaterThanOrEqual(triggerBox.y);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  });
});

// The TMDB Attribution hangs off a trigger in the middle of the desktop filters
// bar, and its panel is wider than the room left beside it. A closed MenuButton
// popup is laid out rather than unmounted, so an outward anchor added its full
// width to the page's scrollable area at every viewport it did not fit — a
// document-level measurement no unit test can make.
test.describe("Attribution popup", () => {
  // Wide enough for the desktop bar, narrow enough that the panel cannot fit
  // between its trigger and the inline-end edge. Above roughly 1200px it fits
  // either way, which is why this went unnoticed on a large display.
  const viewport = { width: 880, height: 900 };
  test.use({ viewport });

  const attributionName = /tmdb attribution info/i;

  test("opens inside the viewport without widening the page", async ({
    page,
  }) => {
    await page.goto("/movie-database");
    // Settle first: the trending rows arrive after the bar, and a row still
    // mid-render is its own transient source of document width.
    const cards = page.getByRole("link").filter({ has: page.getByRole("img") });
    await expect(cards.first()).toBeVisible();
    await page.waitForLoadState("networkidle");

    const documentWidths = () =>
      page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));

    const closed = await documentWidths();
    expect(closed.scroll).toBeLessThanOrEqual(closed.client);

    const trigger = page.getByRole("button", { name: attributionName });
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    const box = await settledPopupBox(
      page.getByRole("group", { name: attributionName }),
    );

    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);

    const open = await documentWidths();
    expect(open.scroll).toBeLessThanOrEqual(open.client);
  });
});
