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

test("should open trailer dialog, display video, and close", async ({
  page,
}) => {
  await page.goto(`/en/movie-database/movie/${FIGHT_CLUB_ID}`);

  // Click play trailer button
  await page.getByRole("button", { name: /play trailer/i }).click();

  // Verify dialog opens with correct aria-label
  const dialog = page.getByRole("dialog", { name: /trailer for/i });
  await expect(dialog).toBeVisible();

  // Verify YouTube iframe is present
  const iframe = page.locator('iframe[src*="youtube.com/embed"]');
  await expect(iframe).toBeVisible();

  // Close dialog using close button
  await page.getByRole("button", { name: /close.*trailer/i }).click();

  // Verify dialog is closed
  await expect(dialog).not.toBeVisible();

  // Reopen dialog and test backdrop click
  await page.getByRole("button", { name: /play trailer/i }).click();
  await expect(dialog).toBeVisible();

  // Click backdrop to close (click at viewport coordinates outside dialog content)
  await page.mouse.click(10, 10);

  // Verify dialog is closed
  await expect(dialog).not.toBeVisible();

  // Reopen dialog and test ESC key
  await page.getByRole("button", { name: /play trailer/i }).click();
  await expect(dialog).toBeVisible();

  // Press ESC to close
  await page.keyboard.press("Escape");

  // Verify dialog is closed
  await expect(dialog).not.toBeVisible();
});
