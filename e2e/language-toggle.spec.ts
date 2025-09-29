import { test, expect } from "@playwright/test";

test.describe("Language Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Clean up cookies after navigating to the page
    await page.context().clearCookies();
    // Reload to ensure clean state
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("should handle bidirectional language switching with URL updates", async ({
    page,
  }) => {
    // Verify initial state: English URL (default locale has no prefix)
    const initialUrl = page.url();
    expect(initialUrl).not.toContain("/zh");

    // Open language selector dropdown - find button by aria-label
    const languageButton = page.locator(
      'button[aria-label="Select a language"]',
    );
    await languageButton.click();
    await page.waitForTimeout(200);

    // Find Chinese language option by aria-label and click it
    const chineseOption = page.locator('a[aria-label="切换至中文"]');
    await expect(chineseOption).toBeVisible();

    // Click and wait for URL to update (client-side navigation)
    await chineseOption.click();
    await page.waitForFunction(() => window.location.pathname.includes("/zh"), {
      timeout: 5000,
    });
    await page.waitForTimeout(500); // Allow content to update

    // Verify URL updated to Chinese
    expect(page.url()).toContain("/zh");

    // Verify cookie is set to Chinese
    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie?.value).toBe("zh");

    // Open dropdown again to switch back to English
    // After switching to Chinese, the aria-label changed to Chinese
    const languageButtonZh = page.locator('button[aria-label="选择语言"]');
    await languageButtonZh.click();
    await page.waitForTimeout(200);

    const englishOptionAfterSwitch = page.locator(
      'a[aria-label="Switch to English"]',
    );
    await expect(englishOptionAfterSwitch).toBeVisible();

    // Click and wait for URL to update back to English (client-side navigation)
    await englishOptionAfterSwitch.click();
    await page.waitForFunction(
      () => !window.location.pathname.includes("/zh"),
      {
        timeout: 5000,
      },
    );
    await page.waitForTimeout(500); // Allow content to update

    // Verify URL updated back to English (default locale has no prefix)
    expect(page.url()).not.toContain("/zh");

    // Verify cookie is updated to English
    const cookiesAfter = await page.context().cookies();
    const localeCookieAfter = cookiesAfter.find(
      (c) => c.name === "NEXT_LOCALE",
    );
    expect(localeCookieAfter?.value).toBe("en");
  });

  test("should preserve search parameters and persist language preference", async ({
    page,
    context,
  }) => {
    // Start from homepage and add query params for testing
    await page.goto("/?test=value");
    await page.waitForLoadState("networkidle");

    // Open language selector and switch to Chinese
    const languageButton = page.locator(
      'button[aria-label="Select a language"]',
    );
    await languageButton.click();
    await page.waitForTimeout(200);

    const chineseOption = page.locator('a[aria-label="切换至中文"]');
    await expect(chineseOption).toBeVisible();

    // Click and wait for URL to update (client-side navigation)
    await chineseOption.click();
    await page.waitForFunction(() => window.location.pathname.includes("/zh"), {
      timeout: 5000,
    });
    await page.waitForTimeout(500); // Allow content to update

    // Verify URL is updated with search parameters preserved
    const urlAfterSwitch = page.url();
    expect(urlAfterSwitch).toContain("/zh");
    expect(urlAfterSwitch).toContain("test=value");

    // Verify cookie is set
    let cookies = await context.cookies();
    let localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie?.value).toBe("zh");

    // Test persistence: create new page in same context (simulates browser session)
    const newPage = await context.newPage();
    await newPage.goto("/zh");
    await newPage.waitForLoadState("networkidle");
    await newPage.waitForTimeout(300);

    // Verify language preference persisted via cookie
    cookies = await context.cookies();
    localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie?.value).toBe("zh");

    // Verify URL still shows Chinese
    expect(newPage.url()).toContain("/zh");

    await newPage.close();
  });
});
