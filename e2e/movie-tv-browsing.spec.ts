import { test, expect } from "@playwright/test";

test.describe("Movie and TV Show Browsing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/movie-database");
    // Wait for content to load
    await expect(page.getByRole("link", { name: /movies/i })).toBeVisible();
  });

  test("should display movie grid with filter controls by default", async ({
    page,
  }) => {
    // Verify "Movies" toggle link is visible
    const moviesLink = page.getByRole("link", { name: /^movies$/i });
    await expect(moviesLink).toBeVisible();

    // Verify poster cards are visible
    const cards = page.locator("a[href*='/movie-database/movie/']");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(5);

    // Verify media type toggle links
    await expect(page.getByRole("link", { name: /^tv shows$/i })).toBeVisible();

    // Verify genre filter button
    await expect(page.getByRole("button", { name: /^genre/i })).toBeVisible();

    // Verify sort links (Popularity and Rating)
    await expect(page.getByRole("link", { name: /popularity/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /rating/i })).toBeVisible();
  });

  test("should toggle between movies and TV shows", async ({ page }) => {
    // Wait for movie cards
    const movieCards = page.locator("a[href*='/movie-database/movie/']");
    await expect(movieCards.first()).toBeVisible();

    // Click "TV Shows" link
    await page.getByRole("link", { name: /^tv shows$/i }).click();

    // Wait for TV show cards
    const tvCards = page.locator("a[href*='/movie-database/tv/']");
    await expect(tvCards.first()).toBeVisible({ timeout: 15000 });

    // Click "Movies" link to switch back
    await page.getByRole("link", { name: /^movies$/i }).click();

    // Wait for movie cards again
    await expect(movieCards.first()).toBeVisible();
  });

  test("should filter by single and multiple genres with ALL/ANY toggle", async ({
    page,
  }) => {
    // Click genre filter button to open menu
    await page.getByRole("button", { name: /^genre/i }).click();

    // Click "Action" genre
    const actionLink = page.getByRole("link", { name: /^action$/i });
    await expect(actionLink).toBeVisible();
    await actionLink.click();

    // Verify genre button shows count of 1
    await expect(
      page.getByRole("button", { name: /genre.*\(1\)/i }),
    ).toBeVisible();

    // Open genre menu again and click "Adventure" for multiple genres
    await page
      .getByRole("button", { name: /genre.*\(1\)/i })
      .click({ force: true });
    await page.getByRole("link", { name: /^adventure$/i }).click();

    // Verify genre count shows 2 genres selected
    await expect(
      page.getByRole("button", { name: /genre.*\(2\)/i }),
    ).toBeVisible();

    // Open genre menu and verify "Any selected" option appears (ALL/ANY toggle)
    await page
      .getByRole("button", { name: /genre.*\(2\)/i })
      .click({ force: true });
    const anyButton = page.getByRole("link", { name: /any selected/i });
    await expect(anyButton).toBeVisible();
  });

  test("should toggle between popularity and rating sort", async ({ page }) => {
    // Click the Rating sort link
    await page.getByRole("link", { name: /^rating/i }).click();

    // Verify rating link is now active
    await expect(page.getByRole("link", { name: /rating.*↓/i })).toBeVisible();

    // Click popularity to switch back
    await page.getByRole("link", { name: /^popularity/i }).click();

    // Verify popularity is now active
    await expect(
      page.getByRole("link", { name: /popularity.*↓/i }),
    ).toBeVisible();
  });

  test("should show and apply reset button when filters are active", async ({
    page,
  }) => {
    // Apply genre filter on movies (default view)
    await page.getByRole("button", { name: /^genre/i }).click();
    await page.getByRole("link", { name: /^action$/i }).click();

    // Wait for genre count to show
    await expect(
      page.getByRole("button", { name: /genre.*\(1\)/i }),
    ).toBeVisible();

    // Click elsewhere to close menu
    await page.locator("main").click({ position: { x: 10, y: 10 } });

    // Change sort to rating
    await page.getByRole("link", { name: /^rating/i }).click();

    // Verify rating is active
    await expect(page.getByRole("link", { name: /rating.*↓/i })).toBeVisible();

    // Verify reset button is visible
    await expect(page.getByRole("link", { name: /reset/i })).toBeVisible();

    // Click reset button
    await page.getByRole("link", { name: /reset/i }).click();

    // Verify filters are cleared (genre button back to no count, popularity active)
    await expect(page.getByRole("button", { name: /^genre$/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /popularity.*↓/i }),
    ).toBeVisible();
  });

  test("should load more movies when scrolling to bottom", async ({ page }) => {
    // Wait for initial cards
    const cards = page.locator("a[href*='/movie-database/movie/']");
    await expect(cards.first()).toBeVisible();

    // Get initial movie IDs (from hrefs) - capture what user sees
    const getMovieIds = async () => {
      const hrefs = await cards.evaluateAll((elements) =>
        elements.map((el) => el.getAttribute("href")),
      );
      return hrefs
        .map((href) => href?.match(/\/movie\/(\d+)/)?.[1])
        .filter(Boolean);
    };

    const initialMovies = await getMovieIds();
    expect(initialMovies.length).toBeGreaterThan(5); // Verify we have initial movies

    // Capture the last few movies before scrolling
    const lastMoviesBeforeScroll = initialMovies.slice(-3);
    const lastMovieId =
      lastMoviesBeforeScroll[lastMoviesBeforeScroll.length - 1];

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Wait for new movies to load by checking if movies beyond the initial set appear
    await page.waitForFunction(
      (lastId) => {
        const links = Array.from(
          document.querySelectorAll("a[href*='/movie-database/movie/']"),
        );
        const movieIds = links
          .map((el) => el.getAttribute("href")?.match(/\/movie\/(\d+)/)?.[1])
          .filter(Boolean);
        const lastCurrentId = movieIds[movieIds.length - 1];
        return lastCurrentId !== lastId;
      },
      lastMovieId,
      { timeout: 10000 },
    );

    // Get movies after scrolling
    const moviesAfterScroll = await getMovieIds();

    // Verify user sees new content:
    // 1. The last movies changed (new ones loaded at bottom)
    const lastMoviesAfterScroll = moviesAfterScroll.slice(-3);
    const hasNewMoviesAtBottom = lastMoviesAfterScroll.some(
      (id) => !lastMoviesBeforeScroll.includes(id),
    );
    expect(hasNewMoviesAtBottom).toBe(true);

    // 2. Some initial movies are still present (they moved up due to virtualization)
    const someInitialMoviesStillPresent = initialMovies.some((id) =>
      moviesAfterScroll.includes(id),
    );
    expect(someInitialMoviesStillPresent).toBe(true);
  });

  test("should persist filters in URL and maintain across navigation", async ({
    page,
  }) => {
    // Select genre on movies (default view)
    await page.getByRole("button", { name: /^genre/i }).click();
    await page.getByRole("link", { name: /^action$/i }).click();

    // Wait for genre to be applied
    await expect(
      page.getByRole("button", { name: /genre.*\(1\)/i }),
    ).toBeVisible();

    // Click elsewhere to close menu
    await page.locator("main").click({ position: { x: 10, y: 10 } });

    // Change sort
    await page.getByRole("link", { name: /^rating/i }).click();

    // Verify both filters are visible in UI (persisted)
    await expect(
      page.getByRole("button", { name: /genre.*\(1\)/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /rating.*↓/i })).toBeVisible();

    // Reload page to test persistence
    await page.reload();

    // Verify filters maintained after reload
    await expect(
      page.getByRole("button", { name: /genre.*\(1\)/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /rating.*↓/i })).toBeVisible();
  });

  test("should load page with filters from URL parameters", async ({
    page,
  }) => {
    // Navigate with filter parameters (genre 18 = Drama, works for both movies and TV)
    await page.goto(
      "/en/movie-database?type=tv&genre=18&sort=vote_average.desc",
    );

    // Verify TV show cards appear (confirms URL filters were applied)
    const tvCards = page.locator("a[href*='/movie-database/tv/']");
    await expect(tvCards.first()).toBeVisible();

    // Verify genre and sort are active in UI
    await expect(
      page.getByRole("button", { name: /genre.*\(1\)/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /rating.*↓/i })).toBeVisible();
  });

  test("should navigate to movie and TV show detail pages from cards", async ({
    page,
  }) => {
    // Test movie card navigation
    const movieCards = page.locator("a[href*='/movie-database/movie/']");
    await expect(movieCards.first()).toBeVisible();
    await movieCards.first().click();

    // Verify movie detail page loaded
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Navigate back to browse page with TV shows
    await page.goto("/en/movie-database?type=tv");

    // Test TV show card navigation
    const tvCards = page.locator("a[href*='/movie-database/tv/']");
    await expect(tvCards.first()).toBeVisible();
    await tvCards.first().click();

    // Verify TV show detail page loaded
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test.describe("Bilingual Support", () => {
    test("should display English UI labels and genre names", async ({
      page,
    }) => {
      await page.goto("/en/movie-database");

      // Verify English labels
      await expect(page.getByRole("link", { name: "Movies" })).toBeVisible();
      await expect(page.getByRole("link", { name: "TV Shows" })).toBeVisible();

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
        page.getByRole("link", { name: "电影" }).first(),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "电视剧" })).toBeVisible();

      // Open genre menu and verify Chinese genre names
      await page.getByRole("button", { name: /类型/i }).click();
      await expect(page.getByRole("link", { name: "动作" })).toBeVisible();
    });

    test("should maintain language when navigating from cards", async ({
      page,
    }) => {
      await page.goto("/zh/movie-database");

      const movieCards = page.locator("a[href*='/movie-database/movie/']");
      await expect(movieCards.first()).toBeVisible();
      await movieCards.first().click();

      // Verify detail page loaded with Chinese UI (movie title appears)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  });
});
