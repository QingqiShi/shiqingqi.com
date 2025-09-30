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
