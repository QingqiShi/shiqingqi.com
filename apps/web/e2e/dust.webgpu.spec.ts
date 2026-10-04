import { expect, test, type Page } from "@playwright/test";
import { countDustPixels } from "./helpers/count-dust-pixels.ts";
import { boxOf, scrollElementTo, scrollToAndSettle } from "./helpers/scroll.ts";

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

declare global {
  interface Window {
    /** How many animation frames the page asked for. */
    frameRequests?: number;
  }
}

test.use({ viewport: { width: 1280, height: 800 } });

const benchElement = (page: Page, name: string) =>
  page.locator(`[data-dust-test="${name}"]`);

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

  // Only the motes and the page show below the element. Each side gets
  // motes, and most sit close to the edge.
  const box = await boxOf(source);
  const below = {
    x: box.x - 40,
    y: box.y + box.height + 1,
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
