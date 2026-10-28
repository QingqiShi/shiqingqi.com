import { test, expect } from "@playwright/test";

test.describe("Language Toggle", () => {
  test("should handle bidirectional language switching", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.getByRole("button", { name: "Select a language" }).click();
    await page.getByRole("menuitem", { name: "切换至中文" }).click();
    await expect(page.getByRole("button", { name: "选择语言" })).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole("button", { name: "选择语言" }).click();
    await page.getByRole("menuitem", { name: "Switch to English" }).click();
    await expect(
      page.getByRole("button", { name: "Select a language" }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("should return 404 for file-like paths misinterpreted as locales", async ({
    page,
  }) => {
    // This path was previously causing a 500 error because "icon.c148568d.png"
    // was being interpreted as a locale
    const response = await page.goto("/icon.c148568d.png");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("Language Toggle and client-router fetches", () => {
  test("keeps English after switching from a zh design-system page", async ({
    browser,
  }) => {
    // The design system rail renders ~30 links to the current locale. A fetch
    // the router made for one of them used to answer with a Set-Cookie for the
    // locale in the URL — overwriting the locale just picked.
    const zhContext = await browser.newContext({ locale: "zh-CN" });
    const page = await zhContext.newPage();

    await page.goto("/design-system");
    await expect(page).toHaveURL(/\/zh\/design-system$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");

    await page.getByRole("button", { name: "选择语言" }).click();
    await page.getByRole("menuitem", { name: "Switch to English" }).click();

    await expect(page).toHaveURL(/\/\/[^/]+\/design-system$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en", {
      timeout: 15000,
    });

    // Let any fetch the service worker still relays settle before reading the
    // cookie
    await page.waitForLoadState("networkidle");
    const localeCookie = (await zhContext.cookies()).find(
      (cookie) => cookie.name === "NEXT_LOCALE",
    );
    expect(localeCookie?.value).toBe("en");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await zhContext.close();
  });
});
