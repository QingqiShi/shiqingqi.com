import { expect, test, type Page } from "@playwright/test";
import {
  effectRecordOf,
  recordEffectLayerFrames,
} from "./helpers/effect-layer-frame.ts";
import { isDrawn, tapAndReadLiquid } from "./helpers/read-liquid.ts";
import { scrollWithin } from "./helpers/scroll.ts";

// The StickyControls page parks a filter bar with a Segmented control over a
// list on the page. StickyControls declares the bar a sticky carrier.
const PAGE = "/en/design-system/components/sticky-controls";
const DEBUG_PAGE = `${PAGE}?effects=debug`;

// The layer mounts after hydration and an async device request.
const MOUNT_TIMEOUT = 15_000;

declare global {
  interface Window {
    /** How many times the liquid took over the Media type indicator. */
    liquidTakeovers?: number;
  }
}

test.use({ viewport: { width: 1280, height: 800 } });

/** The Segmented control's record in the last frame. */
const controlRecord = (page: Page) => effectRecordOf(page, "Media type");

/**
 * The page offset of the sticky bar around the Segmented control, and its
 * computed `z-index`.
 */
function readBar(page: Page) {
  return page.evaluate(() => {
    let node = document.querySelector('[aria-label="Media type"]');
    while (node !== null && getComputedStyle(node).position !== "sticky") {
      node = node.parentElement;
    }
    if (node === null) {
      throw new Error("no sticky bar around the Segmented control");
    }
    return {
      top: node.getBoundingClientRect().top + window.scrollY,
      zIndex: getComputedStyle(node).zIndex,
    };
  });
}

async function barTop(page: Page) {
  return (await readBar(page)).top;
}

test.describe("carrier records", () => {
  test.beforeEach(async ({ page }) => {
    await recordEffectLayerFrames(page);
    await page.goto(DEBUG_PAGE);
    await expect(page.locator('[data-effect-layer="fixed"]')).toHaveCount(1, {
      timeout: MOUNT_TIMEOUT,
    });
    await expect.poll(() => controlRecord(page)).not.toBeNull();
  });

  test("moves a control in a sticky bar to the fixed canvas while the bar is stuck, and back", async ({
    page,
  }) => {
    await expect
      .poll(() => controlRecord(page))
      .toMatchObject({ carrier: "page", offset: 0 });

    const top = await barTop(page);
    await scrollWithin(page, top + 120);
    await expect
      .poll(() => controlRecord(page))
      .toMatchObject({ carrier: "fixed", offset: 0 });

    await scrollWithin(page, 0);
    await expect
      .poll(() => controlRecord(page))
      .toMatchObject({ carrier: "page", offset: 0 });
  });

  test("does not measure a control in a stuck bar again while the page scrolls", async ({
    page,
  }) => {
    const top = await barTop(page);
    await scrollWithin(page, top + 60);
    await expect
      .poll(() => controlRecord(page))
      .toMatchObject({ carrier: "fixed", offset: 0 });
    const stuck = await controlRecord(page);

    for (const y of [top + 120, top + 180, top + 90]) {
      await scrollWithin(page, y);
      await expect
        .poll(() => controlRecord(page))
        .toMatchObject({ carrier: "fixed", offset: 0 });
    }
    expect((await controlRecord(page))?.measurement).toBe(stuck?.measurement);
  });
});

// While the bar is not stuck, the Segmented control draws its liquid on the
// scroll canvas, so the bar must sit under that canvas. Each check reads the
// segment that the tap selects while the control hides its own indicator.
// In the dark scheme the liquid has a lit edge, which the dark track does
// not have.
test.describe("the liquid in a sticky bar", () => {
  test.use({ colorScheme: "dark" });

  const group = (page: Page) =>
    page.getByRole("radiogroup", { name: "Media type" });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.liquidTakeovers = 0;
      new MutationObserver((mutations) => {
        for (const { target } of mutations) {
          if (
            target instanceof Element &&
            target.getAttribute("aria-label") === "Media type" &&
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
    await page.goto(PAGE);
    // The effect can still be compiling its pipeline after the canvas
    // elements mount, so tap until the liquid takes over once.
    await expect
      .poll(
        async () => {
          await page.getByRole("radio", { name: "TV" }).click();
          await page.getByRole("radio", { name: "Movies" }).click();
          return page.evaluate(() => window.liquidTakeovers ?? 0);
        },
        { timeout: MOUNT_TIMEOUT },
      )
      .toBeGreaterThan(0);
    await expect.poll(() => isDrawn(group(page))).toBe(false);
  });

  test("shows the liquid of a control in a sticky bar that is not stuck", async ({
    page,
  }) => {
    expect((await readBar(page)).zIndex).toBe("124");
    const { most, reads } = await tapAndReadLiquid(
      page,
      group(page),
      page.getByRole("radio", { name: "TV" }),
    );
    expect(reads).toBeGreaterThan(0);
    expect(most).toBeGreaterThan(8);
  });

  test("shows the liquid of a control in a stuck bar, and lifts the bar to its plane", async ({
    page,
  }) => {
    const { top } = await readBar(page);
    await scrollWithin(page, top + 120);
    await expect.poll(async () => (await readBar(page)).zIndex).toBe("200");
    const { most, reads } = await tapAndReadLiquid(
      page,
      group(page),
      page.getByRole("radio", { name: "TV" }),
    );
    expect(reads).toBeGreaterThan(0);
    expect(most).toBeGreaterThan(8);
  });
});
