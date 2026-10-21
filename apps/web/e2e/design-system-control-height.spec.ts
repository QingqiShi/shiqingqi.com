import { expect, type Page, test } from "@playwright/test";

const PATH = "/design-system/foundations/layout";

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };

// The `controlHeight` steps in px, below `md` and from `md` up.
const PHONE_HEIGHTS = { xs: 28.8, sm: 38.4, md: 48, lg: 57.6 };
const DESKTOP_HEIGHTS = { xs: 24, sm: 32, md: 40, lg: 48 };

/** The drawn box of each control in each `data-control-step` row. */
function measureRows() {
  return [...document.querySelectorAll<HTMLElement>("[data-control-step]")].map(
    (row) => ({
      step: row.dataset.controlStep ?? "",
      controls: [...row.children].map((item) => {
        const box =
          item.querySelector(
            "input:not([type=checkbox]), select, textarea, [role=radiogroup], [role=switch]",
          ) ?? item;
        const label =
          box.getAttribute("aria-label") ??
          box.getAttribute("placeholder") ??
          item.textContent.trim();
        return {
          name: `<${box.tagName.toLowerCase()}> "${label}"`,
          height: Math.round(box.getBoundingClientRect().height * 10) / 10,
        };
      }),
    }),
  );
}

async function expectStepHeights(page: Page, heights: Record<string, number>) {
  await page.goto(PATH);
  const rows = await page.evaluate(measureRows);
  expect(rows.map((row) => row.step)).toEqual(["xs", "sm", "md", "lg"]);
  for (const row of rows) {
    for (const control of row.controls) {
      expect
        .soft(control.height, `${control.name} at size="${row.step}"`)
        .toBeCloseTo(heights[row.step] ?? 0, 0);
    }
  }
}

test.describe("control height", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test.describe("below md", () => {
    test.use({ viewport: PHONE, hasTouch: true, isMobile: true });

    test("every control at a size step is that step's height", async ({
      page,
    }) => {
      await expectStepHeights(page, PHONE_HEIGHTS);
    });
  });

  test.describe("from md up", () => {
    test.use({ viewport: DESKTOP });

    test("every control at a size step is that step's height", async ({
      page,
    }) => {
      await expectStepHeights(page, DESKTOP_HEIGHTS);
    });
  });
});
