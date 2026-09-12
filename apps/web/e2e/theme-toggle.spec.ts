import { test, expect } from "@playwright/test";

test.describe("Theme Toggle", () => {
  test.beforeEach(async ({ page }) => {
    // Set system preference to light before loading
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    // Wait for content to be visible
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("should detect and apply system preferences (light and dark)", async ({
    page,
  }) => {
    // Verify light theme is applied (background matches light token)
    const backgroundColor = await page.evaluate(
      () => getComputedStyle(document.documentElement).backgroundColor,
    );
    expect(backgroundColor).toBe("rgb(248, 246, 242)");

    // Verify theme toggle shows light state
    await expect(
      page.getByRole("switch", { name: /switch to dark theme/i }),
    ).not.toBeChecked();

    // Change system preference to dark
    await page.emulateMedia({ colorScheme: "dark" });

    // Wait for background to change to dark
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );

    // Verify theme toggle shows dark state
    await expect(
      page.getByRole("switch", { name: /switch to light theme/i }),
    ).toBeChecked();
  });

  test("should handle manual toggle and maintain state consistency", async ({
    page,
  }) => {
    const themeToggle = page.getByRole("switch", {
      name: /switch to (light|dark) theme/i,
    });

    // Verify initial light theme
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(248, 246, 242)",
    );
    await expect(themeToggle).not.toBeChecked();

    // Toggle to dark
    await themeToggle.click();
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
    await expect(themeToggle).toBeChecked();

    // Toggle back to light
    await themeToggle.click();
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(248, 246, 242)",
    );
    await expect(themeToggle).not.toBeChecked();

    // Toggle to dark again for consistency check
    await themeToggle.click();
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
    await expect(themeToggle).toBeChecked();
  });

  test("should persist manual theme choice across browser sessions", async ({
    page,
    context,
  }) => {
    // Set manual theme to dark (system is light)
    const themeToggle = page.getByRole("switch", {
      name: /switch to (light|dark) theme/i,
    });
    await themeToggle.click();
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );

    // Open new page to verify persistence
    const newPage = await context.newPage();
    await newPage.goto("/");
    await expect(newPage.getByRole("heading", { level: 1 })).toBeVisible();

    // Verify dark theme persisted (background is dark)
    await expect(newPage.locator("html")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );

    // Verify toggle shows dark state
    await expect(
      newPage.getByRole("switch", { name: /switch to light theme/i }),
    ).toBeChecked();

    await newPage.close();
  });

  test("should handle reset to system preference", async ({ page }) => {
    const themeToggle = page.getByRole("switch", {
      name: /switch to (light|dark) theme/i,
    });

    // First press: system is light, so the target (dark) differs from it —
    // the store keeps the explicit choice.
    await themeToggle.click();
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
      "dark",
    );

    // Second press: the target (light) is what the system Theme already
    // shows, so the store clears back to "system" instead of pinning
    // "light".
    await themeToggle.click();
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(248, 246, 242)",
    );
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
      "system",
    );

    // Now following "system", the page tracks the system Theme.
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
  });

  test("keeps a dark Preference when the system Theme only coincides with it", async ({
    page,
  }) => {
    const themeToggle = page.getByRole("switch", {
      name: /switch to (light|dark) theme/i,
    });

    // System is light (beforeEach); choose dark explicitly.
    await themeToggle.click();
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
      "dark",
    );

    // The system Theme moving to match the stored Preference, and back away
    // from it again, must never clear the Preference — only a press does.
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
      "dark",
    );

    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
      "dark",
    );
  });
});
