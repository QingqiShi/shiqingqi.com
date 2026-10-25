import { expect, type Page } from "@playwright/test";

export const SHEET_LAB = "/en/design-system/components/sheet/lab";

/** The narrowest viewport that shows the Lab's controls panel: `md`. */
const PANEL_WIDTH = 768;

/**
 * Picks a Variant of the Sheet Lab in its controls panel. On a phone the
 * panel gives way to a bar with a menu, so the page widens for the pick and
 * then narrows back. The Lab keeps its state across the change.
 */
export async function pickSheetVariant(page: Page, name: string) {
  const size = page.viewportSize();
  const isNarrow = size !== null && size.width < PANEL_WIDTH;
  if (isNarrow) {
    await page.setViewportSize({ width: PANEL_WIDTH, height: size.height });
  }
  const variant = page
    .getByRole("radiogroup", { name: "Variants" })
    .getByRole("radio", { name, exact: true });
  await expect(async () => {
    await variant.click({ timeout: 2000 });
    await expect(variant).toBeChecked({ timeout: 1000 });
  }).toPass();
  if (isNarrow) {
    await page.setViewportSize(size);
    await expect(page.getByRole("button", { name: "Controls" })).toBeVisible();
  }
}

/** The button on the Canvas that opens the Sheet. */
export function sheetTrigger(page: Page) {
  return page.getByRole("button", { name: "Open sheet", exact: true });
}

/**
 * Waits until the open Sheet's card holds still: the same box and opacity
 * over a few frames, with no animation running. The Sheet moves on the
 * motion engine, which can write a style each frame instead of running an
 * animation, so an empty list of animations does not mean that it holds still.
 */
export async function waitForSheetToSettle(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const poses: string[] = [];
          for (let frame = 0; frame < 4; frame++) {
            await new Promise(requestAnimationFrame);
            const card = document.querySelector('[role="dialog"]');
            if (!card) return false;
            const { top, left, width, height } = card.getBoundingClientRect();
            const mover = card.parentElement ?? card;
            poses.push(
              [
                top,
                left,
                width,
                height,
                getComputedStyle(mover).opacity,
              ].join(),
            );
          }
          return (
            document.getAnimations().length === 0 &&
            poses.every((pose) => pose === poses[0])
          );
        }),
      // A slow page shows at most 1/30 s of motion in a frame, so the motion
      // can take longer than the time of its curve.
      { timeout: 15_000 },
    )
    .toBe(true);
}
