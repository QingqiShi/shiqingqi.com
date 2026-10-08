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

  test("carries the source the build puts in", async ({ page }) => {
    // A panel keeps its content while collapsed, so the source can be read
    // without opening anything.
    const snippets = await page.locator("pre").allTextContents();

    expect(
      snippets.some(
        (snippet) =>
          snippet.includes(
            'import { Button } from "@tuja/ui/components/button";',
          ) && snippet.includes('<Button look="primary">'),
      ),
    ).toBe(true);
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
