import { expect, test } from "./helpers/test.ts";

// Safari does not focus a link on a press: it moves focus to the nearest
// focusable ancestor, or clears it. A menu that closes when focus leaves it
// is then inert before the click, and the language item never gets the
// click. Chromium focuses the pressed link, so only WebKit on macOS shows it.

test("switches language from the site header in Safari", async ({ page }) => {
  await page.goto("/zh");

  await page.getByRole("button", { name: "选择语言" }).click();
  await page.getByRole("menuitem", { name: "Switch to English" }).click();

  await expect(page).toHaveURL(/\/\/[^/]+\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("switches language from the design-system sidebar in Safari", async ({
  page,
}) => {
  await page.goto("/zh/design-system");

  await page.getByRole("button", { name: "选择语言" }).click();
  await page.getByRole("menuitem", { name: "Switch to English" }).click();

  await expect(page).toHaveURL(/\/\/[^/]+\/design-system$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
