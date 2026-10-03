import { expect, test, type Locator, type Page } from "@playwright/test";
import { scrollToAndSettle, scrollWithin } from "./helpers/scroll.ts";

// The effect layer page, whose dust test bench has dust with no fan in
// reach, a fan close by, two pillars taller than a band, and a far fan.
const PAGE = "/en/design-system/foundations/effect-layer";

// The layer mounts after hydration and an async device request.
const MOUNT_TIMEOUT = 15_000;
// The effect compiles its shaders after the layer mounts, and dust floats
// for a moment before a fan pulls it in. SwiftShader is slow at both.
const FLOW_TIMEOUT = 30_000;
// The longest a particle lives, and some time to spare.
const LAST_PARTICLE_TIMEOUT = 15_000;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

declare global {
  interface Window {
    /** How many animation frames the page asked for. */
    frameRequests?: number;
  }
}

test.use({ viewport: { width: 1280, height: 800 } });

const benchElement = (page: Page, name: string) =>
  page.locator(`[data-dust-test="${name}"]`);

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error("the element has no box");
  }
  return box;
}

/** Scrolls so the element's top sits `offset` px below the viewport top. */
async function scrollElementTo(page: Page, locator: Locator, offset: number) {
  const top = await locator.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  await scrollWithin(page, top - offset);
}

/**
 * How many pixels of a part of the viewport differ from its most common
 * colour, the page background where the test reads it.
 */
async function countDustPixels(page: Page, rect: Rect) {
  const png = await page.screenshot({ clip: rect });
  return page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const bitmap = await createImageBitmap(
      new Blob([bytes], { type: "image/png" }),
    );
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    context?.drawImage(bitmap, 0, 0);
    const data =
      context?.getImageData(0, 0, bitmap.width, bitmap.height).data ?? [];
    const counts = new Map<number, number>();
    for (let at = 0; at < data.length; at += 4) {
      const key = (data[at] << 16) | (data[at + 1] << 8) | data[at + 2];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const [background] = [...counts].reduce((most, entry) =>
      entry[1] > most[1] ? entry : most,
    );
    let count = 0;
    for (let at = 0; at < data.length; at += 4) {
      const difference = Math.max(
        Math.abs(data[at] - ((background >> 16) & 255)),
        Math.abs(data[at + 1] - ((background >> 8) & 255)),
        Math.abs(data[at + 2] - (background & 255)),
      );
      if (difference > 24) {
        count += 1;
      }
    }
    return count;
  }, png.toString("base64"));
}

async function waitForLayer(page: Page) {
  await expect(page.locator('[data-effect-layer="scroll"]')).toHaveCount(2, {
    timeout: MOUNT_TIMEOUT,
  });
}

test("sheds dust that an extractor fan pulls in", async ({ page }) => {
  await page.goto(PAGE);
  await waitForLayer(page);
  const source = benchElement(page, "near-source");
  await scrollElementTo(page, source, 300);

  const from = await boxOf(source);
  const to = await boxOf(benchElement(page, "near-fan"));
  const between = {
    x: from.x + from.width + 24,
    y: from.y - 20,
    width: to.x - from.x - from.width - 48,
    height: from.height + 40,
  };
  await expect
    .poll(() => countDustPixels(page, between), { timeout: FLOW_TIMEOUT })
    .toBeGreaterThan(8);
});

test("flows on across a band edge", async ({ page }) => {
  await page.goto(PAGE);
  await waitForLayer(page);
  const source = benchElement(page, "pillar-source");
  const edge = await source.evaluate((element) => {
    const canvas = document.querySelector('[data-effect-layer="scroll"]');
    if (!(canvas instanceof HTMLElement) || canvas.parentElement === null) {
      return null;
    }
    const bandHeight = Number.parseFloat(canvas.style.height);
    const layerTop =
      canvas.parentElement.getBoundingClientRect().top + window.scrollY;
    const top = element.getBoundingClientRect().top + window.scrollY;
    return (
      layerTop + Math.ceil((top + 120 - layerTop) / bandHeight) * bandHeight
    );
  });
  if (edge === null) {
    throw new Error("no scroll canvas element");
  }
  await scrollToAndSettle(page, Math.round(edge - 400));

  const from = await boxOf(source);
  const to = await boxOf(benchElement(page, "pillar-fan"));
  expect(from.y + 120).toBeLessThanOrEqual(400);
  expect(from.y + from.height - 120).toBeGreaterThanOrEqual(400);
  const gap = (y: number) => ({
    x: from.x + from.width + 8,
    y,
    width: to.x - from.x - from.width - 16,
    height: 120,
  });
  await expect
    .poll(
      async () =>
        Math.min(
          await countDustPixels(page, gap(400 - 128)),
          await countDustPixels(page, gap(400 + 8)),
        ),
      { timeout: FLOW_TIMEOUT },
    )
    .toBeGreaterThan(5);
});

test("stops asking for frames once no dust is near the screen", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.frameRequests = 0;
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      window.frameRequests = (window.frameRequests ?? 0) + 1;
      return request(callback);
    };
  });
  await page.goto(PAGE);
  await waitForLayer(page);
  const framesIn = async (milliseconds: number) => {
    const before = await page.evaluate(() => window.frameRequests ?? 0);
    await page.waitForTimeout(milliseconds);
    return (await page.evaluate(() => window.frameRequests ?? 0)) - before;
  };

  await scrollElementTo(page, benchElement(page, "near-source"), 300);
  await expect
    .poll(() => framesIn(500), { timeout: FLOW_TIMEOUT })
    .toBeGreaterThan(0);

  await scrollToAndSettle(page, 0);
  await expect
    .poll(() => framesIn(500), { timeout: LAST_PARTICLE_TIMEOUT })
    .toBe(0);
});

test("holds still under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(PAGE);
  await waitForLayer(page);
  const source = benchElement(page, "near-source");
  await scrollElementTo(page, source, 300);

  // Only the motes and the page show below the element.
  const box = await boxOf(source);
  const below = {
    x: box.x - 40,
    y: box.y + box.height + 4,
    width: box.width + 80,
    height: 36,
  };
  await expect
    .poll(() => countDustPixels(page, below), { timeout: FLOW_TIMEOUT })
    .toBeGreaterThan(5);
  let still = await page.screenshot({ clip: below });
  await expect
    .poll(async () => {
      const next = await page.screenshot({ clip: below });
      const same = next.equals(still);
      still = next;
      return same;
    })
    .toBe(true);
  await page.waitForTimeout(600);
  expect((await page.screenshot({ clip: below })).equals(still)).toBe(true);
});
