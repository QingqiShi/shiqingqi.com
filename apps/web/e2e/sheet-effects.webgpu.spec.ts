import { expect, test, type Page } from "@playwright/test";
import { recordEffectLayerFrames } from "./helpers/effect-layer-frame.ts";
import { isDrawn, tapAndReadLiquid } from "./helpers/read-liquid.ts";
import {
  pickSheetVariant,
  SHEET_LAB,
  sheetTrigger,
} from "./helpers/sheet-lab.ts";

// The Tall Variant of the Sheet Lab ends in a sticky bar with a Segmented
// control. Its content is taller than the card, so the bar is stuck to the
// bottom of the sheet's Scroll region from the start.

// The layer mounts after hydration and an async device request.
const MOUNT_TIMEOUT = 15_000;

declare global {
  interface Window {
    /** How many times the liquid took over the Text size indicator. */
    liquidTakeovers?: number;
  }
}

test.use({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });

const group = (page: Page) =>
  page.getByRole("radiogroup", { name: "Text size" });

async function openTallSheet(page: Page) {
  await pickSheetVariant(page, "Tall");
  await sheetTrigger(page).click();
  await expect(page.getByRole("dialog", { name: "A long read" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBe(0);
}

/**
 * The record of the Text size control in the last frame: the carrier it
 * draws on, and how far the record is from where the browser lays the
 * control out now.
 */
function controlRecord(page: Page) {
  return page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    const frame = window.lastEffectLayerFrame;
    const control = document.querySelector('[aria-label="Text size"]');
    const record = frame?.elements.find(
      ({ element, roles }) =>
        roles !== 0 &&
        control !== null &&
        (control.contains(element) || element.contains(control)),
    );
    if (frame === undefined || record === undefined) {
      return null;
    }
    const top = record.element.getBoundingClientRect().top;
    return {
      carrier: record.carrier,
      offset: Math.round(record.y - frame.scrollY - top),
    };
  });
}

test("draws a control in the stuck bar of a sheet on the fixed canvas", async ({
  page,
}) => {
  await recordEffectLayerFrames(page);
  await page.goto(`${SHEET_LAB}?effects=debug`);
  await openTallSheet(page);
  await expect
    .poll(() => controlRecord(page), { timeout: MOUNT_TIMEOUT })
    .toMatchObject({ carrier: "fixed", offset: 0 });
});

test("shows the liquid of a control in the stuck bar of a sheet", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.liquidTakeovers = 0;
    new MutationObserver((mutations) => {
      for (const { target } of mutations) {
        if (
          target instanceof Element &&
          target.getAttribute("aria-label") === "Text size" &&
          target.hasAttribute("data-effect-drawn")
        ) {
          window.liquidTakeovers = (window.liquidTakeovers ?? 0) + 1;
        }
      }
    }).observe(document, {
      attributes: true,
      attributeFilter: ["data-effect-drawn"],
      subtree: true,
    });
  });
  await page.goto(SHEET_LAB);
  await openTallSheet(page);
  // The effect can still be compiling its pipeline after the canvas
  // elements mount, so tap until the liquid takes over once.
  await expect
    .poll(
      async () => {
        await page.getByRole("radio", { name: "Small" }).click();
        await page.getByRole("radio", { name: "Medium" }).click();
        return page.evaluate(() => window.liquidTakeovers ?? 0);
      },
      { timeout: MOUNT_TIMEOUT },
    )
    .toBeGreaterThan(0);
  await expect.poll(() => isDrawn(group(page))).toBe(false);

  const { most, reads } = await tapAndReadLiquid(
    page,
    group(page),
    page.getByRole("radio", { name: "Large" }),
  );
  expect(reads).toBeGreaterThan(0);
  expect(most).toBeGreaterThan(8);
});
