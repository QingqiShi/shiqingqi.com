import { test, expect } from "@playwright/test";

test.describe("Language Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for actual content to be visible
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("should handle bidirectional language switching", async ({ page }) => {
    // Verify we start with English content by checking button text
    await expect(
      page.getByRole("button", { name: "Select a language" }),
    ).toBeVisible();

    // Open language selector and switch to Chinese
    await page.getByRole("button", { name: "Select a language" }).click();
    await page.getByRole("link", { name: "切换至中文" }).click();

    // Wait for content to change to Chinese (button text changes)
    await expect(page.getByRole("button", { name: "选择语言" })).toBeVisible();

    // Switch back to English
    await page.getByRole("button", { name: "选择语言" }).click();
    await page.getByRole("link", { name: "Switch to English" }).click();

    // Wait for content to change back to English (button text changes)
    await expect(
      page.getByRole("button", { name: "Select a language" }),
    ).toBeVisible();
  });

  test("should persist language preference across browser sessions", async ({
    page,
    context,
  }) => {
    // Switch to Chinese
    await page.getByRole("button", { name: "Select a language" }).click();
    await page.getByRole("link", { name: "切换至中文" }).click();

    // Wait for content to change to Chinese
    await expect(page.getByRole("button", { name: "选择语言" })).toBeVisible();

    // Open new page to test persistence
    const newPage = await context.newPage();
    await newPage.goto("/");
    await expect(newPage.getByRole("heading", { level: 1 })).toBeVisible();

    // Verify language persisted (Chinese button should be visible)
    await expect(
      newPage.getByRole("button", { name: "选择语言" }),
    ).toBeVisible();

    await newPage.close();
  });
});
