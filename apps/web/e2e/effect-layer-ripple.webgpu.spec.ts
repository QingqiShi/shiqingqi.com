import { expect, test, type Page } from "@playwright/test";
import { readScreenshotColumn } from "./helpers/read-screenshot-column.ts";
import { scrollToAndSettle, scrollWithin } from "./helpers/scroll.ts";

const PAGE = "/en/design-system/foundations/effect-layer";

// The layer mounts after hydration and an async device request.
const MOUNT_TIMEOUT = 15_000;
// A ring of the largest tile ends well within this many ms.
const PULSE_MS = 2500;

declare global {
  interface Window {
    /** How many animation frames have run since the page loaded. */
    animationFrames?: number;
  }
}

test.use({ viewport: { width: 1280, height: 800 } });

const accentTile = (page: Page) => page.locator('[data-ripple-test="accent"]');

/** Moves the pointer where it starts no pulse. */
const parkPointer = (page: Page) => page.mouse.move(4, 4);

async function openBench(page: Page) {
  await page.addInitScript(() => {
    window.animationFrames = 0;
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) =>
      request((time) => {
        window.animationFrames = (window.animationFrames ?? 0) + 1;
        callback(time);
      });
  });
  await page.goto(PAGE);
  await expect(page.locator('[data-effect-layer="scroll"]')).toHaveCount(2, {
    timeout: MOUNT_TIMEOUT,
  });
  const top = await accentTile(page).evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  await scrollWithin(page, top - 300);
  await parkPointer(page);
}

const animationFrames = (page: Page) =>
  page.evaluate(() => window.animationFrames ?? 0);

/** How many frames have run since `start` frames. */
const framesSince = async (page: Page, start: number) =>
  (await animationFrames(page)) - start;

/**
 * Hovers the accent tile until a ring runs frames, because the effect can
 * still be compiling its pipeline after the canvas elements mount.
 */
async function waitForRipple(page: Page) {
  await expect
    .poll(
      async () => {
        await parkPointer(page);
        const start = await animationFrames(page);
        await accentTile(page).hover();
        await page.waitForTimeout(400);
        return framesSince(page, start);
      },
      { timeout: 20_000 },
    )
    .toBeGreaterThan(5);
  await parkPointer(page);
}

/** Whether no frame runs for a while. */
async function expectIdle(page: Page) {
  await expect
    .poll(
      async () => {
        const start = await animationFrames(page);
        await page.waitForTimeout(500);
        return framesSince(page, start);
      },
      { timeout: 10_000 },
    )
    .toBe(0);
}

/** The column through the accent tile's centre, and the rows just above it. */
async function columnAboveTile(page: Page) {
  const box = await accentTile(page).boundingBox();
  if (box === null) {
    throw new Error("the accent tile has no box");
  }
  const column = await readScreenshotColumn(
    page,
    Math.round(box.x + box.width / 2),
  );
  const top = Math.floor(box.y);
  return column
    .slice(top - 40, top - 2)
    .map((pixel) => pixel.split(",").map(Number));
}

/** How far any pixel above the tile moved from `baseline`, in any channel. */
async function changeAbove(page: Page, baseline: number[][]) {
  const column = await columnAboveTile(page);
  let largest = 0;
  for (const [row, pixel] of column.entries()) {
    for (const [channel, value] of pixel.entries()) {
      largest = Math.max(largest, Math.abs(value - baseline[row][channel]));
    }
  }
  return largest;
}

test("runs frames only while a ring travels", async ({ page }) => {
  await openBench(page);
  await waitForRipple(page);
  await expectIdle(page);

  const start = await animationFrames(page);
  await accentTile(page).click();
  await expect.poll(() => framesSince(page, start)).toBeGreaterThan(5);
  await page.waitForTimeout(PULSE_MS);
  await expectIdle(page);
});

test("draws no frame for an ambient element out of view", async ({ page }) => {
  await openBench(page);
  await waitForRipple(page);
  await page
    .getByRole("switch", { name: "Pulse the accent tile on a beat" })
    .click();
  await parkPointer(page);
  // One beat comes within four seconds while the tile is in view.
  const start = await animationFrames(page);
  await expect
    .poll(() => framesSince(page, start), { timeout: 6_000 })
    .toBeGreaterThan(5);

  await scrollToAndSettle(page, 0);
  await page.waitForTimeout(PULSE_MS);
  const away = await animationFrames(page);
  await page.waitForTimeout(4_000);
  expect(await framesSince(page, away)).toBe(0);
});

test.describe("under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("holds a still ring of the fill while hovered, in both themes", async ({
    page,
  }) => {
    await openBench(page);
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await parkPointer(page);
      await expectIdle(page);
      const baseline = await columnAboveTile(page);

      await accentTile(page).hover();
      // The effect can still be compiling its pipeline at first.
      await expect
        .poll(() => changeAbove(page, baseline), { timeout: 20_000 })
        .toBeGreaterThan(20);
      // Still, so it draws no frame while the pointer rests.
      await expectIdle(page);

      await parkPointer(page);
      await expect.poll(() => changeAbove(page, baseline)).toBeLessThan(3);
    }
  });
});
