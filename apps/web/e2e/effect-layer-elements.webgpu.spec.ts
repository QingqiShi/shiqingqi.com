import { expect, test, type Page } from "@playwright/test";
import { readScreenshotColumn } from "./helpers/read-screenshot-column.ts";
import { scrollWithin } from "./helpers/scroll.ts";
import { findStatusBarCandidates } from "./helpers/status-bar.ts";

// The effect layer page. Its test bench registers elements without an effect,
// one of them fixed, and each effect's bench registers more.
const PAGE = "/en/design-system/foundations/effect-layer";
const DEBUG_PAGE = `${PAGE}?effects=debug`;

// The layer mounts after hydration and an async device request.
const MOUNT_TIMEOUT = 15_000;

// The debug view's line on the edge of an element in the document, in 8-bit
// sRGB: vec3f(0.1, 0.7, 0.2).
const DOCUMENT_LINE = [26, 179, 51];

interface EffectFrameDetail {
  scrollX: number;
  scrollY: number;
  elements: {
    element: Element;
    x: number;
    y: number;
    width: number;
    height: number;
    fixed: boolean;
    radii: readonly number[];
    fill: readonly number[];
  }[];
  pointer: {
    x: number;
    y: number;
    pressed: boolean;
    present: boolean;
  };
}

declare global {
  interface Window {
    /** The detail of the last `effectlayerframe` event. */
    lastEffectLayerFrame?: EffectFrameDetail;
  }
  interface WindowEventMap {
    effectlayerframe: CustomEvent<EffectFrameDetail>;
  }
}

test.use({ viewport: { width: 1280, height: 800 } });

/**
 * How far each record of the last frame is from where the browser lays its
 * element out now, in CSS px, rounded to a tenth.
 */
function recordOffsets(page: Page) {
  return page.evaluate(() => {
    const frame = window.lastEffectLayerFrame;
    if (frame === undefined) {
      return [];
    }
    const round = (value: number) => Math.round(value * 10) / 10;
    return frame.elements.map((record) => {
      const rect = record.element.getBoundingClientRect();
      return [
        round(record.x - frame.scrollX - rect.left),
        round(record.y - frame.scrollY - rect.top),
        round(record.width - rect.width),
        round(record.height - rect.height),
      ];
    });
  });
}

/** How many elements the page registers: one per outermost boundary. */
function registeredCount(page: Page) {
  return page.evaluate(
    () =>
      document.querySelectorAll(
        "[data-effect-boundary]:not([data-effect-boundary] > *)",
      ).length,
  );
}

const frameElementCount = (page: Page) =>
  page.evaluate(() => window.lastEffectLayerFrame?.elements.length);

/** Whether every record of the last frame sits on its element. */
async function expectAligned(page: Page) {
  const aligned = Array.from({ length: await registeredCount(page) }, () => [
    0, 0, 0, 0,
  ]);
  await expect.poll(() => recordOffsets(page)).toEqual(aligned);
}

const firstElement = (page: Page) =>
  page.locator("[data-effect-test-element]").first();

/** Whether the debug line sits just outside the first element's left edge. */
async function expectLineOnLeftEdge(page: Page) {
  const box = await firstElement(page).boundingBox();
  if (box === null) {
    throw new Error("the first test element has no box");
  }
  const y = Math.round(box.y + box.height / 2);
  const outside = (await readScreenshotColumn(page, Math.floor(box.x) - 1))[y]
    .split(",")
    .map(Number);
  for (const [index, channel] of DOCUMENT_LINE.entries()) {
    expect(Math.abs(outside[index] - channel)).toBeLessThanOrEqual(4);
  }
  const inside = (await readScreenshotColumn(page, Math.ceil(box.x) + 3))[y];
  expect(inside).not.toBe(outside.join(","));
}

test("mounts no canvas element for elements without an effect", async ({
  page,
}) => {
  await page.goto(PAGE);
  // The Ripple elements mount the scroll canvas elements; the fixed element,
  // which has no effect, must not mount the fixed one.
  await expect(page.locator('[data-effect-layer="scroll"]')).toHaveCount(2, {
    timeout: MOUNT_TIMEOUT,
  });
  await page.getByRole("switch", { name: "Show the fixed element" }).click();
  await expect(page.locator("[data-effect-test-fixed]")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[data-effect-layer="fixed"]')).toHaveCount(0);
});

test.describe("in the debug view", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.addEventListener("effectlayerframe", (event) => {
        window.lastEffectLayerFrame = event.detail;
      });
    });
    await page.goto(DEBUG_PAGE);
    await expect(page.locator('[data-effect-layer="fixed"]')).toHaveCount(1, {
      timeout: MOUNT_TIMEOUT,
    });
    const registered = await registeredCount(page);
    await expect.poll(() => frameElementCount(page)).toBe(registered);
  });

  test("measures each element where the browser lays it out", async ({
    page,
  }) => {
    await expectAligned(page);

    const top = await firstElement(page).evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    );
    await scrollWithin(page, top - 300);
    await expectAligned(page);
    await expectLineOnLeftEdge(page);

    // Content above the elements moves them without a scroll or a resize.
    const before = await firstElement(page).boundingBox();
    await page.getByRole("button", { name: "Add block above" }).click();
    await expect(page.locator("[data-effect-test-block]")).toBeVisible();
    const after = await firstElement(page).boundingBox();
    expect((after?.y ?? 0) - (before?.y ?? 0)).toBeGreaterThan(50);
    await expectAligned(page);
    await expectLineOnLeftEdge(page);
  });

  test("registers a fixed element on the fixed canvas element", async ({
    page,
  }) => {
    const fixedRecord = () =>
      page.evaluate(() => {
        const frame = window.lastEffectLayerFrame;
        const record = frame?.elements.find((item) =>
          item.element.matches("[data-effect-test-fixed]"),
        );
        if (frame === undefined || record === undefined) {
          return null;
        }
        return {
          fixed: record.fixed,
          viewportTop: Math.round(record.y - frame.scrollY),
          top: Math.round(record.element.getBoundingClientRect().top),
        };
      });

    for (const y of [0, 600, 1400]) {
      await scrollWithin(page, y);
      await expect
        .poll(async () => {
          const record = await fixedRecord();
          return (
            record !== null && record.fixed && record.viewportTop === record.top
          );
        })
        .toBe(true);
      expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);
    }

    const registered = await registeredCount(page);
    await page.getByRole("switch", { name: "Show the fixed element" }).click();
    await expect.poll(() => frameElementCount(page)).toBe(registered - 1);
  });

  test("reads the fill and the corners, and follows a theme change", async ({
    page,
  }) => {
    const fillOf = () =>
      firstElement(page).evaluate((element) => {
        const record = window.lastEffectLayerFrame?.elements.find(
          (item) => item.element === element,
        );
        const computed = getComputedStyle(element)
          .backgroundColor.match(/\d+(\.\d+)?/g)
          ?.slice(0, 3)
          .map(Number);
        return {
          record: record?.fill
            .slice(0, 3)
            .map((channel) => Math.round(channel * 255)),
          computed,
          radii: record?.radii,
        };
      });

    const light = await fillOf();
    expect(light.record).toEqual(light.computed);
    expect(light.radii?.every((radius) => radius > 0)).toBe(true);

    await page.emulateMedia({ colorScheme: "dark" });
    await expect
      .poll(async () => {
        const dark = await fillOf();
        return (
          JSON.stringify(dark.record) === JSON.stringify(dark.computed) &&
          JSON.stringify(dark.computed) !== JSON.stringify(light.computed)
        );
      })
      .toBe(true);
  });

  test("follows the pointer in page coordinates", async ({ page }) => {
    await scrollWithin(page, 500);
    const pointer = () =>
      page.evaluate(() => window.lastEffectLayerFrame?.pointer);

    await page.mouse.move(264, 300);
    await expect
      .poll(pointer)
      .toMatchObject({ x: 264, y: 800, present: true, pressed: false });

    await page.mouse.down();
    await expect.poll(pointer).toMatchObject({ pressed: true });
    await page.mouse.up();
    await expect.poll(pointer).toMatchObject({ pressed: false });
  });
});
