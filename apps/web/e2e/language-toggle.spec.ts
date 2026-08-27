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
    await page.getByRole("menuitem", { name: "切换至中文" }).click();

    // Wait for content to change to Chinese (button text changes)
    await expect(page.getByRole("button", { name: "选择语言" })).toBeVisible({
      timeout: 15000,
    });

    // Switch back to English
    await page.getByRole("button", { name: "选择语言" }).click();
    await page.getByRole("menuitem", { name: "Switch to English" }).click();

    // Wait for content to change back to English (button text changes)
    await expect(
      page.getByRole("button", { name: "Select a language" }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("should persist language preference across browser sessions", async ({
    page,
    context,
  }) => {
    // Switch to Chinese
    await page.getByRole("button", { name: "Select a language" }).click();
    await page.getByRole("menuitem", { name: "切换至中文" }).click();

    // Wait for content to change to Chinese
    await expect(page.getByRole("button", { name: "选择语言" })).toBeVisible({
      timeout: 15000,
    });

    // Open new page to test persistence
    const newPage = await context.newPage();
    await newPage.goto("/");
    await expect(newPage.getByRole("heading", { level: 1 })).toBeVisible();

    // Verify language persisted (Chinese button should be visible)
    await expect(newPage.getByRole("button", { name: "选择语言" })).toBeVisible(
      { timeout: 15000 },
    );

    await newPage.close();
  });

  test("should maintain language preference when navigating to detail pages", async ({
    page,
  }) => {
    // Start on Chinese page
    await page.goto("/zh");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "选择语言" })).toBeVisible();

    // Switch to English
    await page.getByRole("button", { name: "选择语言" }).click();
    await page.getByRole("menuitem", { name: "Switch to English" }).click();

    // Wait for language switch to complete
    await expect(
      page.getByRole("button", { name: "Select a language" }),
    ).toBeVisible({ timeout: 15000 });

    // Navigate to Citadel detail page
    await page
      .getByRole("link", { name: /Citadel.*August 2021 to now/i })
      .click();

    // Verify we're on the English detail page (not /zh/experiences/citadel)
    await expect(page).toHaveURL(/\/experiences\/citadel$/);
    await expect(
      page.getByRole("heading", { name: /Software Engineer/i }),
    ).toBeVisible();

    // Verify language stayed in English (not reverted to Chinese)
    await expect(
      page.getByRole("button", { name: "Select a language" }),
    ).toBeVisible();
    await expect(
      page.getByText(/At Citadel, I work as a software engineer/i),
    ).toBeVisible();
  });

  test("should detect browser locale preference for first-time visitors", async ({
    browser,
  }) => {
    // Create a new context with Chinese browser locale preference
    const zhContext = await browser.newContext({
      locale: "zh-CN",
    });
    const page = await zhContext.newPage();

    // Visit root without any locale cookie
    await page.goto("/");

    // Should redirect to Chinese based on browser preference
    await expect(page).toHaveURL(/\/zh\/?$/);
    await expect(page.getByRole("button", { name: "选择语言" })).toBeVisible();

    await zhContext.close();

    // Create a new context with English browser locale preference
    const enContext = await browser.newContext({
      locale: "en-US",
    });
    const enPage = await enContext.newPage();

    // Visit root without any locale cookie
    await enPage.goto("/");

    // Should stay on English (default locale, no redirect)
    await expect(enPage).toHaveURL(/\/?$/);
    await expect(
      enPage.getByRole("button", { name: "Select a language" }),
    ).toBeVisible();

    await enContext.close();
  });

  test("should preserve query parameters when switching languages", async ({
    page,
  }) => {
    // Navigate to a page with query parameters (using movie search as example)
    await page.goto("/?search=action");

    // Wait for page to load
    await expect(
      page.getByRole("button", { name: "Select a language" }),
    ).toBeVisible();

    // Switch to Chinese
    await page.getByRole("button", { name: "Select a language" }).click();
    await page.getByRole("menuitem", { name: "切换至中文" }).click();

    // Wait for language switch to complete
    await expect(page.getByRole("button", { name: "选择语言" })).toBeVisible({
      timeout: 15000,
    });

    // Verify URL has both locale prefix and query parameters
    await expect(page).toHaveURL(/\/zh\/?\?search=action/);

    // Switch back to English
    await page.getByRole("button", { name: "选择语言" }).click();
    await page.getByRole("menuitem", { name: "Switch to English" }).click();

    // Wait for language switch to complete
    await expect(
      page.getByRole("button", { name: "Select a language" }),
    ).toBeVisible({ timeout: 15000 });

    // Verify query parameters are still preserved
    await expect(page).toHaveURL(/\/?\?search=action/);
  });

  test("should auto-redirect to saved locale when manually navigating to non-prefixed URL", async ({
    page,
  }) => {
    // First, switch to Chinese to save the preference
    await page.goto("/");
    await page.getByRole("button", { name: "Select a language" }).click();
    await page.getByRole("menuitem", { name: "切换至中文" }).click();

    // Wait for language switch to complete
    await expect(page.getByRole("button", { name: "选择语言" })).toBeVisible({
      timeout: 15000,
    });

    // Now manually navigate to a non-prefixed URL
    await page.goto("/experiences/citadel");

    // Should auto-redirect to Chinese version based on saved preference
    await expect(page).toHaveURL(/\/zh\/experiences\/citadel$/);
    await expect(page.getByRole("button", { name: "选择语言" })).toBeVisible();

    // Verify we're seeing Chinese content
    await expect(
      page.getByRole("heading", { name: /软件工程师/i }),
    ).toBeVisible();
  });

  test("should handle invalid locale prefix gracefully", async ({ page }) => {
    // Navigate to a URL with an unsupported locale
    const response = await page.goto("/fr/experiences/citadel");

    // Should return 404 for invalid locale
    expect(response?.status()).toBe(404);
  });

  test("should return 404 for file-like paths misinterpreted as locales", async ({
    page,
  }) => {
    // This path was previously causing a 500 error because "icon.c148568d.png"
    // was being interpreted as a locale
    const response = await page.goto("/icon.c148568d.png");

    // Verify 404 status (not 500 server error)
    expect(response?.status()).toBe(404);

    // Verify the user sees the branded 404 rather than Next's bare error
    // document. This path skips the locale rewrite in `src/proxy.ts` (it has a
    // file extension), so it is rejected by the router above the `[locale]`
    // segment and served the prerendered root 404 — the case that breaks the
    // moment that screen reaches for a request-time API.
    await expect(
      page.getByRole("heading", { name: "This page doesn't exist", level: 1 }),
    ).toBeVisible();

    // And that it is not a dead end: the 404 offers a way back into the site.
    await expect(
      page.getByRole("link", { name: "Back to home" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Movie Database/ }),
    ).toBeVisible();
  });
});

test.describe("Language Toggle on prefetch-heavy pages", () => {
  test("keeps English after switching from a zh-prefetched design-system page", async ({
    browser,
  }) => {
    // The design system rail renders ~30 links to the current locale. Next
    // prefetches them, and every prefetch used to answer with a Set-Cookie for
    // the locale in the URL — overwriting the locale just picked.
    const zhContext = await browser.newContext({ locale: "zh-CN" });
    const page = await zhContext.newPage();

    await page.goto("/design-system");
    await expect(page).toHaveURL(/\/zh\/design-system$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");

    // Hover a few rail links so their prefetches are in flight during the switch
    const railLinks = page
      .getByRole("navigation", { name: "设计系统" })
      .getByRole("link");
    for (let index = 0; index < 4; index++) {
      await railLinks.nth(index).hover();
    }

    // Switch to English
    await page.getByRole("button", { name: "选择语言" }).click();
    await page.getByRole("menuitem", { name: "Switch to English" }).click();

    // `//host/design-system`, never `//host/zh/design-system`
    await expect(page).toHaveURL(/\/\/[^/]+\/design-system$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en", {
      timeout: 15000,
    });
    await expect(
      page.getByRole("button", { name: "Select a language" }),
    ).toBeVisible();

    // Let the new page's own prefetches, and any stale ones the service worker
    // still relays, settle before reading the cookie
    await page.waitForLoadState("networkidle");
    const localeCookie = (await zhContext.cookies()).find(
      (cookie) => cookie.name === "NEXT_LOCALE",
    );
    expect(localeCookie?.value).toBe("en");

    // A later navigation and a reload must both stay English
    await page
      .getByRole("navigation", { name: "Design system" })
      .getByRole("link", { name: "Colour" })
      .click();
    await expect(page).toHaveURL(
      /\/\/[^/]+\/design-system\/foundations\/color$/,
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await zhContext.close();
  });

  test("the running server writes no locale cookie for a prefetch", async ({
    request,
  }) => {
    // The unit test calls `proxy()` directly; this one goes through the real
    // Next server, so it proves the adapter does not re-emit the stripped
    // cookie from `x-middleware-set-cookie`, and that the header assumptions
    // hold at runtime.
    const response = await request.get("/zh/design-system", {
      headers: {
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        Cookie: "NEXT_LOCALE=en",
      },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(200);
    const localeCookieHeaders = response
      .headersArray()
      .filter(
        (header) =>
          header.name.toLowerCase() === "set-cookie" &&
          header.value.includes("NEXT_LOCALE"),
      );
    expect(localeCookieHeaders).toEqual([]);
  });
});
