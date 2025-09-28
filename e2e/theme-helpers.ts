import { expect, type Page } from "@playwright/test";

/**
 * Helper utilities for testing theme toggle functionality
 */

export class ThemeTestHelpers {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the home page where the theme toggle exists
   */
  async navigateToHomePage() {
    await this.page.goto("/");
    // Wait for the page to be fully loaded
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Locate the theme toggle component by aria-label
   */
  getThemeToggle() {
    return this.page.getByRole("switch", { name: /theme/i });
  }

  /**
   * Get the current theme value from localStorage
   */
  async getThemeFromLocalStorage(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return localStorage.getItem("theme");
    });
  }

  /**
   * Set theme value in localStorage
   */
  async setThemeInLocalStorage(theme: "light" | "dark" | "system") {
    await this.page.evaluate((themeValue) => {
      localStorage.setItem("theme", themeValue);
    }, theme);
  }

  /**
   * Get the meta theme-color tag content
   */
  async getMetaThemeColor(): Promise<string | null> {
    return await this.page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="theme-color"]');
      return metaTag?.getAttribute("content") || null;
    });
  }

  /**
   * Get computed background color of the document body
   */
  async getComputedBackgroundColor(): Promise<string> {
    return await this.page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
  }

  /**
   * Check if the theme toggle switch is checked (indicates dark theme)
   */
  async isThemeToggleChecked(): Promise<boolean> {
    const toggle = this.getThemeToggle();
    const ariaChecked = await toggle.getAttribute("aria-checked");
    return ariaChecked === "true";
  }

  /**
   * Click the theme toggle to switch themes
   */
  async clickThemeToggle() {
    const toggle = this.getThemeToggle();
    await toggle.click();
    // Wait for theme transition to complete
    await this.page.waitForTimeout(100);
  }

  /**
   * Emulate system color scheme preference
   */
  async emulateSystemColorScheme(scheme: "light" | "dark") {
    await this.page.emulateMedia({ colorScheme: scheme });
  }

  /**
   * Hover over the theme toggle area to reveal system reset button
   */
  async hoverThemeToggle() {
    const toggle = this.getThemeToggle();
    await toggle.hover();
  }

  /**
   * Get the system reset button (only visible on hover after manual theme change)
   */
  getSystemResetButton() {
    // The reset button should appear near the theme toggle
    // This selector will need to be refined based on actual implementation
    return this.page.getByRole("button", { name: /system|reset/i });
  }

  /**
   * Click the system reset button to restore system preference
   */
  async clickSystemResetButton() {
    const resetButton = this.getSystemResetButton();
    await resetButton.click();
    // Wait for theme transition to complete
    await this.page.waitForTimeout(100);
  }

  /**
   * Wait for theme transition to complete
   */
  async waitForThemeTransition() {
    // Wait for any CSS transitions to complete
    await this.page.waitForTimeout(200);
  }

  /**
   * Assert that localStorage contains expected theme value
   */
  async assertLocalStorageTheme(expectedTheme: string) {
    const actualTheme = await this.getThemeFromLocalStorage();
    expect(actualTheme).toBe(expectedTheme);
  }

  /**
   * Assert that meta theme-color matches expected color
   */
  async assertMetaThemeColor(expectedColor: string) {
    const actualColor = await this.getMetaThemeColor();
    expect(actualColor).toBe(expectedColor);
  }

  /**
   * Assert that computed background color indicates light theme
   */
  async assertLightThemeBackground() {
    const bgColor = await this.getComputedBackgroundColor();
    // Light theme should have a light background (typically white or near-white)
    // This assertion will need refinement based on actual theme colors
    expect(bgColor).toMatch(
      /rgb\(255,\s*255,\s*255\)|rgb\(25[0-4],\s*25[0-4],\s*25[0-4]\)/,
    );
  }

  /**
   * Assert that computed background color indicates dark theme
   */
  async assertDarkThemeBackground() {
    const bgColor = await this.getComputedBackgroundColor();
    // Dark theme should have a dark background (typically black or near-black)
    // This assertion will need refinement based on actual theme colors
    expect(bgColor).toMatch(/rgb\([0-5][0-9]?,\s*[0-5][0-9]?,\s*[0-5][0-9]?\)/);
  }

  /**
   * Clean up: Reset to system theme and clear any localStorage overrides
   */
  async cleanup() {
    await this.page.evaluate(() => {
      localStorage.removeItem("theme");
    });
    await this.emulateSystemColorScheme("light");
    await this.page.reload();
    await this.waitForThemeTransition();
  }
}

/**
 * Theme color constants for assertions
 */
export const THEME_COLORS = {
  LIGHT: "#ffffff",
  DARK: "#000000",
} as const;

/**
 * localStorage theme values
 */
export const THEME_VALUES = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const;
