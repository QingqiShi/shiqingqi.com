import { test, expect } from "@playwright/test";

test.describe("Homepage Portfolio", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("should display headline, biography, and all three content sections", async ({
    page,
  }) => {
    await expect(page.locator("p").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /projects/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /experiences/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /education/i }),
    ).toBeVisible();
  });

  test("should navigate to an experience detail page when its card is clicked", async ({
    page,
  }) => {
    await page.getByRole("link", { name: /citadel/i }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: /citadel/i }),
    ).toBeVisible({ timeout: 15000 });
  });
});
