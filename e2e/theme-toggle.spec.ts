import { test, expect } from "@playwright/test";

test.describe("Theme Toggle", () => {
  test.beforeEach(async ({ page }) => {
    // Set default system preference to light
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Clean up localStorage after navigating to the page
    await page.evaluate(() => {
      localStorage.removeItem("theme");
    });
    // Reload to ensure clean state
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("should detect and apply system preferences (light and dark)", async ({
    page,
  }) => {
    // Test light system preference
    await page.emulateMedia({ colorScheme: "light" });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check that no manual theme is stored in localStorage
    let storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBeNull();

    // Check that the toggle shows light theme state (checkbox should not be checked)
    let themeToggle = page.getByRole("checkbox", {
      name: /switch to dark theme/i,
    });
    let isChecked = await themeToggle.isChecked();
    expect(isChecked).toBe(false);

    // Check that meta theme-color is set to light theme color
    let metaThemeColor = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="theme-color"]');
      return metaTag?.getAttribute("content") || null;
    });
    expect(metaThemeColor).toBe("#ffffff");

    // Test dark system preference
    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check that no manual theme is stored in localStorage
    storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBeNull();

    // Check that the toggle shows dark theme state (checkbox should be checked)
    themeToggle = page.getByRole("checkbox", {
      name: /switch to light theme/i,
    });
    isChecked = await themeToggle.isChecked();
    expect(isChecked).toBe(true);

    // Check that meta theme-color is set to dark theme color
    metaThemeColor = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="theme-color"]');
      return metaTag?.getAttribute("content") || null;
    });
    expect(metaThemeColor).toBe("#000000");
  });

  test("should handle manual toggle and maintain state consistency", async ({
    page,
  }) => {
    // Start with light system preference
    await page.emulateMedia({ colorScheme: "light" });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const themeToggle = page.locator("#theme-switch");

    // Initial state verification (light system preference)
    let isChecked = await themeToggle.isChecked();
    expect(isChecked).toBe(false);

    // Toggle to dark
    await themeToggle.click();
    await page.waitForTimeout(200);

    // Check that theme is now manually set to dark
    let storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBe("dark");

    // Check that toggle shows dark state
    isChecked = await themeToggle.isChecked();
    expect(isChecked).toBe(true);

    // Check that meta theme-color is set to dark theme color
    let metaThemeColor = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="theme-color"]');
      return metaTag?.getAttribute("content") || null;
    });
    expect(metaThemeColor).toBe("#000000");

    // Toggle back to light
    await themeToggle.click();
    await page.waitForTimeout(200);

    // Check that theme is now manually set to light
    storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBe("light");

    // Check that toggle shows light state
    isChecked = await themeToggle.isChecked();
    expect(isChecked).toBe(false);

    // Check that meta theme-color is set to light theme color
    metaThemeColor = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="theme-color"]');
      return metaTag?.getAttribute("content") || null;
    });
    expect(metaThemeColor).toBe("#ffffff");

    // Toggle to dark again (state consistency verification)
    await themeToggle.click();
    await page.waitForTimeout(200);

    // Final verification - should be dark again
    storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBe("dark");

    isChecked = await themeToggle.isChecked();
    expect(isChecked).toBe(true);

    metaThemeColor = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="theme-color"]');
      return metaTag?.getAttribute("content") || null;
    });
    expect(metaThemeColor).toBe("#000000");
  });

  test("should persist manual theme choice across browser sessions", async ({
    page,
    context,
  }) => {
    // Set manual theme to dark
    await page.emulateMedia({ colorScheme: "light" }); // System is light
    const themeToggle = page.locator("#theme-switch");
    await themeToggle.click();
    await page.waitForTimeout(200);

    // Verify dark theme is stored
    let storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBe("dark");

    // Create new page in same context (simulates browser session persistence)
    const newPage = await context.newPage();
    await newPage.goto("/");
    await newPage.waitForLoadState("networkidle");

    // Wait for theme to be applied from localStorage
    await newPage.waitForTimeout(300);

    // Check that manual theme persisted
    storedTheme = await newPage.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBe("dark");

    // Check that toggle shows dark state
    const newThemeToggle = newPage.locator("#theme-switch");
    const isChecked = await newThemeToggle.isChecked();
    expect(isChecked).toBe(true);

    // Check that meta theme-color is set to dark theme color
    const metaThemeColor = await newPage.evaluate(() => {
      const metaTag = document.querySelector('meta[name="theme-color"]');
      return metaTag?.getAttribute("content") || null;
    });
    expect(metaThemeColor).toBe("#000000");

    await newPage.close();
  });

  test("should handle advanced theme behavior and reset functionality", async ({
    page,
  }) => {
    // Start with light system preference
    await page.emulateMedia({ colorScheme: "light" });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const themeToggle = page.locator("#theme-switch");

    // Manually set theme to dark (so reset button will appear on hover)
    await themeToggle.click();
    await page.waitForTimeout(200);

    // Verify dark theme is manually set
    let storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBe("dark");

    // Hover over theme toggle to show system reset button
    await themeToggle.hover();
    await page.waitForTimeout(100);

    // Look for system reset button (has role="radio" and should be visible on hover/focus)
    const resetButton = page.getByRole("radio");
    await expect(resetButton).toBeVisible();

    // Click system reset button to restore system preference
    await resetButton.click();
    await page.waitForTimeout(200);

    // Verify theme is reset to system preference (theme is set to "system")
    storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBe("system");

    // Verify toggle shows light state (matching system preference)
    let isChecked = await themeToggle.isChecked();
    expect(isChecked).toBe(false);

    // Verify meta theme-color is set to light theme color
    let metaThemeColor = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="theme-color"]');
      return metaTag?.getAttribute("content") || null;
    });
    expect(metaThemeColor).toBe("#ffffff");

    // Now test dynamic system preference change with emulateMedia
    // Change system preference to dark while theme is following system
    await page.emulateMedia({ colorScheme: "dark" });
    await page.waitForTimeout(300); // Allow time for system preference detection

    // Verify theme automatically updates to follow new system preference
    isChecked = await themeToggle.isChecked();
    expect(isChecked).toBe(true);

    metaThemeColor = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="theme-color"]');
      return metaTag?.getAttribute("content") || null;
    });
    expect(metaThemeColor).toBe("#000000");

    // Verify theme is still "system" (following system preference)
    storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBe("system");

    // Change system preference back to light to verify it follows
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForTimeout(300);

    // Verify theme automatically updates back to light
    isChecked = await themeToggle.isChecked();
    expect(isChecked).toBe(false);

    metaThemeColor = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="theme-color"]');
      return metaTag?.getAttribute("content") || null;
    });
    expect(metaThemeColor).toBe("#ffffff");

    // Final verification: manually override theme again to ensure reset behavior still works
    await themeToggle.click();
    await page.waitForTimeout(200);

    // Verify manual dark theme is set
    storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBe("dark");

    // Now system preference changes should NOT affect the theme (user has manually overridden)
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForTimeout(300);

    // Theme should remain dark despite light system preference
    isChecked = await themeToggle.isChecked();
    expect(isChecked).toBe(true);

    metaThemeColor = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="theme-color"]');
      return metaTag?.getAttribute("content") || null;
    });
    expect(metaThemeColor).toBe("#000000");

    // Manual theme should still be stored
    storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBe("dark");
  });
});
