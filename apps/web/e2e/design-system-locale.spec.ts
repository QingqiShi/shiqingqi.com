import { expect, test } from "./helpers/test.ts";

/**
 * A route with a Lab renders its doc header from its own `layout.tsx`. Next
 * renders that layout concurrently with the root layout, so the header must
 * resolve the Locale itself: a `/zh` page once shipped an English breadcrumb,
 * title, description and view switch under a Chinese site header.
 */
const cjk = /[㐀-鿿]/;

test("a Lab doc header is in Chinese on /zh", async ({ page }) => {
  await page.goto("/zh/design-system/components/switch");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(cjk);
  await expect(page.getByRole("article")).not.toContainText("Design system");
});
