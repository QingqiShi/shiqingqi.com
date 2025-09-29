import { test, expect } from "@playwright/test";

test.describe("Theme Toggle", () => {
  test.beforeEach(async ({ page }) => {
    // Clean up and set system preference before loading
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => {
      localStorage.removeItem("theme");
    });
    await page.goto("/");
    // Wait for content to be visible
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("should detect and apply system preferences (light and dark)", async ({
    page,
  }) => {
    // Verify light theme is applied (background is white)
    const backgroundColor = await page.evaluate(
      () => getComputedStyle(document.documentElement).backgroundColor,
    );
    expect(backgroundColor).toBe("rgb(255, 255, 255)");

    // Verify theme toggle shows light state
    await expect(
      page.getByRole("checkbox", { name: /switch to dark theme/i }),
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
      page.getByRole("checkbox", { name: /switch to light theme/i }),
    ).toBeChecked();
  });

  test("should handle manual toggle and maintain state consistency", async ({
    page,
  }) => {
    const themeToggle = page.getByRole("checkbox", {
      name: /switch to (light|dark) theme/i,
    });

    // Verify initial light theme
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
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
      "rgb(255, 255, 255)",
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
    const themeToggle = page.getByRole("checkbox", {
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
      newPage.getByRole("checkbox", { name: /switch to light theme/i }),
    ).toBeChecked();

    await newPage.close();
  });

  test("should handle reset to system preference", async ({ page }) => {
    const themeToggle = page.getByRole("checkbox", {
      name: /switch to (light|dark) theme/i,
    });

    // Manually set theme to dark
    await themeToggle.click();
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );

    // Hover/focus to show reset button
    await themeToggle.hover();
    const resetButton = page.getByRole("radio", {
      name: /switch to system theme/i,
    });
    await expect(resetButton).toBeVisible();

    // Reset to system preference
    await resetButton.click();
    // System is light, so background should be white
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );

    // Change system preference while following system
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );

    // Change back to light
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );

    // Manually override again
    await themeToggle.click();
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );

    // System preference changes should NOT affect manual theme
    await page.emulateMedia({ colorScheme: "light" });
    // Should remain dark
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
  });
});
