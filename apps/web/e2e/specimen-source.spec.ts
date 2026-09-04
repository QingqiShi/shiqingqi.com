import { test, expect, type Page } from "@playwright/test";

const BUTTON_PAGE = "/design-system/components/button";

/**
 * `useId` puts characters in an id that a CSS selector cannot carry, so a panel
 * is always located by attribute rather than by `#id`.
 */
function panelFor(page: Page, panelId: string) {
  return page.locator(`[id="${panelId}"]`);
}

test.describe("Specimen source", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BUTTON_PAGE);
    // A dev server compiles this route on the first hit, which outruns the
    // default expect timeout. A built server answers immediately.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("reveals one specimen's source at a time", async ({ page }) => {
    const controls = page.getByRole("button", { name: "Code" });
    await expect(controls.first()).toBeVisible();

    const first = controls.first();
    await expect(first).toHaveAttribute("aria-expanded", "false");

    const panelId = await first.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = panelFor(page, panelId ?? "");
    await expect(panel).toBeHidden();

    await first.click();
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();

    // Every other specimen stays shut.
    await expect(controls.nth(1)).toHaveAttribute("aria-expanded", "false");

    await first.click();
    await expect(first).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
  });

  test("carries the source each specimen is built from", async ({ page }) => {
    // A panel keeps its content while collapsed, so the whole page's worth of
    // source can be read without opening anything.
    const snippets = await page.locator("pre").allTextContents();
    expect(snippets.length).toBeGreaterThan(0);

    // The real variant, from the real specimen.
    expect(
      snippets.some((snippet) =>
        snippet.includes('<Button variant="primary">'),
      ),
    ).toBe(true);

    // Every snippet opens with the imports that make it runnable.
    expect(snippets.every((snippet) => snippet.includes("import "))).toBe(true);

    // `t({ en, zh })` is unwrapped, so no i18n plumbing reaches the reader.
    expect(snippets.every((snippet) => !snippet.includes("t({"))).toBe(true);
  });

  test("colours the source rather than shipping one plain run", async ({
    page,
  }) => {
    const control = page.getByRole("button", { name: "Code" }).first();
    await control.click();
    const panelId = await control.getAttribute("aria-controls");

    const colours = await panelFor(page, panelId ?? "")
      .locator("code span")
      .evaluateAll((spans) =>
        spans.map((span) => getComputedStyle(span).color),
      );

    expect(colours.length).toBeGreaterThan(1);
    expect(new Set(colours).size).toBeGreaterThan(1);
  });

  test("opens from the keyboard", async ({ page }) => {
    const control = page.getByRole("button", { name: "Code" }).first();
    await control.focus();
    await expect(control).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(control).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Enter");
    await expect(control).toHaveAttribute("aria-expanded", "false");
  });

  test("keeps a wide snippet from widening the page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BUTTON_PAGE);

    await page.getByRole("button", { name: "Code" }).first().click();

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
  });
});
