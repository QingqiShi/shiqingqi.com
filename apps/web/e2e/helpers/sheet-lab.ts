import { expect, type Page } from "@playwright/test";
import { waitForMotionToSettle } from "./motion.ts";

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

/** Waits until the open Sheet's card holds still. */
export async function waitForSheetToSettle(page: Page) {
  await expect(page.getByRole("dialog")).toBeVisible();
  await waitForMotionToSettle(page);
}
