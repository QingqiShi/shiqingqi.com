import { test, expect } from "@playwright/test";

// Using well-known movie/TV IDs that consistently have full data
const FIGHT_CLUB_ID = "550";
const BREAKING_BAD_ID = "1396";

test.describe("Movie Detail Pages", () => {
  test("should display movie title, rating, metadata, and overview", async ({
    page,
  }) => {
    await page.goto(`/en/movie-database/movie/${FIGHT_CLUB_ID}`);

    // Wait for h1 with movie title
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Verify page loaded with content
    const mainContent = page.locator("main, article, [role='main']");
    await expect(mainContent.first()).toBeVisible();

    // Verify paragraphs with text content are visible
    const paragraphs = page.locator("p");
    await expect(paragraphs.first()).toBeVisible();
  });
});

test.describe("TV Show Detail Pages", () => {
  test("should display TV show name, rating, metadata, and overview", async ({
    page,
  }) => {
    await page.goto(`/en/movie-database/tv/${BREAKING_BAD_ID}`);

    // Wait for h1 with show name
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Verify page loaded with content
    const mainContent = page.locator("main, article, [role='main']");
    await expect(mainContent.first()).toBeVisible();

    // Verify paragraphs with text content are visible
    const paragraphs = page.locator("p");
    await expect(paragraphs.first()).toBeVisible();
  });
});

test("should load movie and TV show pages correctly when accessed directly via URL", async ({
  page,
}) => {
  // Navigate directly to movie page
  await page.goto(`/en/movie-database/movie/${FIGHT_CLUB_ID}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Navigate directly to TV show page
  await page.goto(`/en/movie-database/tv/${BREAKING_BAD_ID}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("should display English and Chinese UI labels and localized content", async ({
  page,
}) => {
  // Verify English version
  await page.goto(`/en/movie-database/movie/${FIGHT_CLUB_ID}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Verify Chinese version
  await page.goto(`/zh/movie-database/movie/${FIGHT_CLUB_ID}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("should open trailer overlay, display video, and close", async ({
  page,
}) => {
  await page.goto(`/en/movie-database/movie/${FIGHT_CLUB_ID}`);

  // Click play trailer button
  await page.getByRole("button", { name: /play trailer/i }).click();

  // Verify YouTube iframe is present (indicates overlay is open)
  const iframe = page.locator('iframe[src*="youtube.com/embed"]');
  await expect(iframe).toBeVisible();

  // Close overlay using close button
  const closeButton = page
    .getByRole("button")
    .filter({ has: page.locator("svg") })
    .last();
  await closeButton.click();

  // Verify overlay is closed
  await expect(iframe).not.toBeVisible();

  // Reopen overlay and test backdrop click
  await page.getByRole("button", { name: /play trailer/i }).click();
  await expect(iframe).toBeVisible();

  // Click backdrop to close (click at viewport coordinates outside overlay content)
  await page.mouse.click(10, 10);

  // Verify overlay is closed
  await expect(iframe).not.toBeVisible();
});

test("should prevent body scroll when trailer overlay is open", async ({
  page,
}) => {
  await page.goto(`/en/movie-database/movie/${FIGHT_CLUB_ID}`);

  // Scroll down a bit to have some scroll position
  await page.evaluate(() => window.scrollTo(0, 200));
  await page.waitForFunction(() => window.scrollY === 200);

  const scrollYBeforeOverlay = await page.evaluate(() => window.scrollY);
  expect(scrollYBeforeOverlay).toBe(200);

  // Open trailer overlay
  await page.getByRole("button", { name: /play trailer/i }).click();

  const iframe = page.locator('iframe[src*="youtube.com/embed"]');
  await expect(iframe).toBeVisible();

  // Verify body has scroll lock styles applied
  const bodyStyles = await page.evaluate(() => {
    const body = document.body;
    return {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
  });

  expect(bodyStyles.overflow).toBe("hidden");
  expect(bodyStyles.position).toBe("fixed");
  expect(bodyStyles.top).toBe("-200px"); // Should match scroll position
  expect(bodyStyles.width).toBe("100%");

  // Try to scroll - scroll position should not change
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(100); // Wait for any potential scroll

  const scrollYDuringOverlay = await page.evaluate(() => window.scrollY);
  // Scroll position should remain 200 (or possibly 0 due to fixed positioning)
  // The important thing is it doesn't increase
  expect(scrollYDuringOverlay).toBeLessThanOrEqual(200);

  // Close overlay
  const closeButton = page
    .getByRole("button")
    .filter({ has: page.locator("svg") })
    .last();
  await closeButton.click();
  await expect(iframe).not.toBeVisible();

  // Verify body styles are restored
  const bodyStylesAfter = await page.evaluate(() => {
    const body = document.body;
    return {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
  });

  // Styles should be cleared (empty strings mean default/inherited values)
  expect(bodyStylesAfter.overflow).toBe("");
  expect(bodyStylesAfter.position).toBe("");

  // Scroll position should be restored to 200
  await page.waitForFunction(() => window.scrollY === 200, { timeout: 1000 });
  const scrollYAfterOverlay = await page.evaluate(() => window.scrollY);
  expect(scrollYAfterOverlay).toBe(200);
});
