import { test, expect, type Page } from "@playwright/test";

// Using well-known movie/TV IDs that consistently have full data
const FIGHT_CLUB_ID = "550";
const BREAKING_BAD_ID = "1396";

/**
 * Scroll to `y` and hold there. Until the content is tall enough, `scrollTo`
 * clamps on a still-hydrating page and never sticks (source of a shard-5
 * flake), so poll until the scroll actually holds.
 */
async function scrollToAndSettle(page: Page, y: number) {
  await page.waitForFunction((target) => {
    window.scrollTo(0, target);
    return window.scrollY === target;
  }, y);
}

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

  // Wait for view transition animation to complete before clicking backdrop
  await page.waitForTimeout(500);

  // Click backdrop to close (click at viewport coordinates outside overlay content)
  await page.mouse.click(5, 5);

  // Verify overlay is closed
  await expect(iframe).not.toBeVisible();
});

test("should prevent body scroll when trailer overlay is open", async ({
  page,
}) => {
  await page.goto(`/en/movie-database/movie/${FIGHT_CLUB_ID}`);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await scrollToAndSettle(page, 200);

  // Open the trailer overlay.
  await page.getByRole("button", { name: /play trailer/i }).click();
  const iframe = page.locator('iframe[src*="youtube.com/embed"]');
  await expect(iframe).toBeVisible();

  // The overlay locks body scroll — react-remove-scroll marks the document
  // with `data-scroll-locked` while active.
  const scrollLock = page.locator("[data-scroll-locked]");
  await expect(scrollLock).toHaveCount(1);

  // A wheel gesture must not scroll the page past where it was.
  await page.mouse.wheel(0, 500);
  const scrollYDuringOverlay = await page.evaluate(() => window.scrollY);
  expect(scrollYDuringOverlay).toBeLessThanOrEqual(200);

  // Closing removes the overlay and releases the scroll lock. (We don't assert
  // the exact restored scroll position: react-remove-scroll only locks/unlocks
  // scrolling, it doesn't restore a saved offset, so the post-close position is
  // not a stable guarantee — asserting `=== 200` was the original flake.)
  const closeButton = page
    .getByRole("button")
    .filter({ has: page.locator("svg") })
    .last();
  await closeButton.click();
  await expect(iframe).not.toBeVisible();
  await expect(scrollLock).toHaveCount(0);
});

/**
 * The fixed or sticky boxes Safari on iOS would sample for the status-bar
 * colour: the ones under the top-centre of the viewport that WebKit does not
 * walk past. Runs in the page, so keep it standalone. See "Progressive blur"
 * in packages/ui/CONTEXT.md.
 */
function findStatusBarCandidates() {
  const pointX = window.innerWidth / 2;
  const pointY = 4;

  return [...document.querySelectorAll("body *")]
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const coversPoint =
        rect.left <= pointX &&
        pointX <= rect.right &&
        rect.top <= pointY &&
        pointY <= rect.bottom;
      if (!coversPoint) {
        return false;
      }

      const style = getComputedStyle(element);
      if (style.position !== "fixed" && style.position !== "sticky") {
        return false;
      }
      if (style.visibility === "hidden") {
        return false;
      }

      const isTransparent = style.backgroundColor === "rgba(0, 0, 0, 0)";
      const isEmptyAndTransparent =
        element.children.length === 0 &&
        isTransparent &&
        style.backdropFilter === "none";
      if (isEmptyAndTransparent) {
        return false;
      }

      const isWide = rect.width >= window.innerWidth * 0.9;
      const isTall = rect.height >= window.innerHeight * 0.9;
      if (!isWide && !isTall) {
        return false;
      }
      // WebKit skips a box taller than the viewport with no background, and a
      // viewport-sized box behind the page.
      if (rect.height >= window.innerHeight * 1.05 && isTransparent) {
        return false;
      }
      return !(isWide && isTall && Number(style.zIndex) < 0);
    })
    .map(
      (element) =>
        `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}`,
    );
}

test("should keep every fixed box under the top-centre of the viewport narrow", async ({
  page,
}) => {
  await page.goto(`/en/movie-database/movie/${FIGHT_CLUB_ID}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Safari on iOS keeps sampling the top edge after a scroll, so check there.
  await scrollToAndSettle(page, 200);
  expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);

  // Opening the trailer fills the page's portal target, which must stay a
  // 0 x 0 anchor no matter what it hosts.
  await page.getByRole("button", { name: /play trailer/i }).click();
  const iframe = page.locator('iframe[src*="youtube.com/embed"]');
  await expect(iframe).toBeVisible();
  expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);

  await page.getByRole("button", { name: "Close" }).click();
  await expect(iframe).not.toBeVisible();
  expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);
});
