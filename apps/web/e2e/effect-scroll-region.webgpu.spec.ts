import { expect, test, type Page } from "@playwright/test";
import {
  effectRecordOf,
  recordEffectLayerFrames,
} from "./helpers/effect-layer-frame.ts";
import { scrollWithin } from "./helpers/scroll.ts";

// The Scroll region bench, once shown, is a vertical Scroll mask with a
// Segmented control in each row, and a button that adds four more regions.
const PAGE = "/en/design-system/effect-layer";

// The layer mounts after hydration and an async device request.
const MOUNT_TIMEOUT = 15_000;

const region = (page: Page) => page.locator("[data-effect-test-region]");
const regionCanvases = (page: Page) =>
  region(page).locator('[data-effect-layer="region"]');

/**
 * The record of the control labelled `label` in the last frame, and whether
 * it draws on a Scroll region.
 */
async function recordOf(page: Page, label: string) {
  const record = await effectRecordOf(page, label);
  return record && { ...record, onRegion: typeof record.carrier === "number" };
}

/** Opens the bench and waits until its region has its canvases. */
async function showRegionBench(page: Page) {
  await recordEffectLayerFrames(page);
  await page.goto(`${PAGE}?effects=debug`);
  await page
    .getByRole("button", { name: "Show the Scroll region bench" })
    .click();
  await region(page).scrollIntoViewIfNeeded();
  await expect(regionCanvases(page)).toHaveCount(2, {
    timeout: MOUNT_TIMEOUT,
  });
}

/** The record of the Segmented control of row `row` in the last frame. */
function controlRecord(page: Page, row: number) {
  return recordOf(page, `Row ${String(row)}`);
}

const stickyBar = (page: Page) =>
  page.locator("[data-effect-test-region-sticky]");

/**
 * The computed `z-index` of the sticky bar in the bench region, after a
 * frame.
 */
function stickyBarPlane(page: Page) {
  return stickyBar(page).evaluate(async (bar) => {
    await new Promise(requestAnimationFrame);
    return getComputedStyle(bar).zIndex;
  });
}

/** The `translateY` of each scroll <canvas> element of the bench region. */
function bandOffsets(page: Page) {
  return regionCanvases(page).evaluateAll(async (canvases) => {
    await new Promise(requestAnimationFrame);
    return canvases.map((canvas) =>
      canvas instanceof HTMLElement
        ? {
            transform: canvas.style.transform,
            height: Number.parseFloat(canvas.style.height),
          }
        : null,
    );
  });
}

test.describe("a Scroll region", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await showRegionBench(page);
    await expect
      .poll(() => controlRecord(page, 1), { timeout: MOUNT_TIMEOUT })
      .toMatchObject({ onRegion: true, offset: 0 });
  });

  test("draws its controls on its own canvases, and measures none of them again while it scrolls", async ({
    page,
  }) => {
    const before = await controlRecord(page, 12);
    for (const top of [120, 400, 60, 10_000]) {
      // Scroll the region with no frame in between.
      await region(page).evaluate((scroller, scrollTop) => {
        scroller.scrollTop = scrollTop;
      }, top);
      await expect
        .poll(() => controlRecord(page, 12))
        .toMatchObject({ onRegion: true, offset: 0 });
    }
    expect((await controlRecord(page, 12))?.measurement).toBe(
      before?.measurement,
    );
  });

  test("places its canvases on the bands of its content, which scroll with it", async ({
    page,
  }) => {
    await region(page).evaluate((scroller) => {
      scroller.scrollTop = scroller.scrollHeight;
    });
    await expect
      .poll(async () => {
        const bands = await bandOffsets(page);
        return bands.every(
          (band) =>
            band !== null &&
            (band.transform === "" ||
              /^translateY\(\d+(\.\d+)?px\)$/.test(band.transform)),
        );
      })
      .toBe(true);
    const bands = await bandOffsets(page);
    const height = bands[0]?.height ?? 0;
    expect(height).toBeGreaterThan(0);
    for (const band of bands) {
      const top = Number.parseFloat(
        /translateY\(([\d.]+)px\)/.exec(band?.transform ?? "")?.[1] ?? "0",
      );
      expect(top % height).toBe(0);
    }
  });

  test("gives every Scroll region its canvases when more than three show", async ({
    page,
  }) => {
    const allRegionCanvases = page.locator('[data-effect-layer="region"]');
    const before = await allRegionCanvases.count();
    await page
      .getByRole("button", { name: "Show four extra Scroll regions" })
      .click();
    await expect(allRegionCanvases).toHaveCount(before + 4 * 2, {
      timeout: MOUNT_TIMEOUT,
    });
  });
});

test.describe("a sticky bar in a Scroll region", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  const SWITCH = "Switch in sticky bar";

  test.beforeEach(async ({ page }) => {
    await showRegionBench(page);
    await expect
      .poll(() => recordOf(page, SWITCH), { timeout: MOUNT_TIMEOUT })
      .toMatchObject({ onRegion: true, offset: 0 });
  });

  test("stays under the region's canvases until it sticks to the region's scroller, then lifts and draws its Switch around the region", async ({
    page,
  }) => {
    expect(await stickyBarPlane(page)).toBe("124");

    // At the top of the viewport, but not at the top of the region's
    // scroller: a box that sticks to the region is not stuck here.
    const pageTop = await stickyBar(page).evaluate(
      (bar) => bar.getBoundingClientRect().top + window.scrollY,
    );
    await scrollWithin(page, pageTop);
    await expect
      .poll(() => recordOf(page, SWITCH))
      .toMatchObject({ onRegion: true, offset: 0 });
    expect(await stickyBarPlane(page)).toBe("124");

    await region(page).scrollIntoViewIfNeeded();
    await stickyBar(page).evaluate((bar) => {
      const scroller = bar.closest("[data-effect-test-region]");
      if (scroller === null) {
        throw new Error("no region around the sticky bar");
      }
      scroller.scrollTop =
        bar.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        120;
    });
    await expect.poll(() => stickyBarPlane(page)).toBe("200");
    await expect
      .poll(() => recordOf(page, SWITCH))
      .toMatchObject({ onRegion: false, offset: 0 });

    await region(page).evaluate((scroller) => {
      scroller.scrollTop = 0;
    });
    await expect.poll(() => stickyBarPlane(page)).toBe("124");
    await expect
      .poll(() => recordOf(page, SWITCH))
      .toMatchObject({ onRegion: true, offset: 0 });
  });
});

test.describe("a modal cover", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("takes the page's canvases away while the drawer is open, and gives them back", async ({
    page,
  }) => {
    await page.goto(PAGE);
    const pageCanvases = page.locator('[data-effect-layer="scroll"]');
    await expect(pageCanvases).toHaveCount(2, { timeout: MOUNT_TIMEOUT });
    await scrollWithin(page, 0);

    await page.getByRole("button", { name: "Design system menu" }).click();
    await expect(pageCanvases).toHaveCount(0);

    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(pageCanvases).toHaveCount(2);
  });
});
