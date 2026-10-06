import { expect, test, type Page } from "@playwright/test";
import { countDustPixels } from "./helpers/count-dust-pixels.ts";
import { boxOf, scrollElementTo } from "./helpers/scroll.ts";

// The effect layer page, whose Effect container test bench has dust in a
// container beside a fan on the page, dust on the page beside a container
// that holds a fan, and rings close to a container's edge.
const PAGE = "/en/design-system/effect-layer";

// The layer mounts after hydration and an async device request.
const MOUNT_TIMEOUT = 15_000;
// The effect compiles its shaders after the layer mounts. SwiftShader is
// slow at that.
const FLOW_TIMEOUT = 30_000;
// How long a region must stay clear of dust: longer than a particle takes
// to float off its element, and longer than a fan takes to pull it.
const WATCH_MILLISECONDS = 4000;

test.use({ viewport: { width: 1280, height: 800 } });

const benchElement = (page: Page, name: string) =>
  page.locator(`[data-effect-container-test="${name}"]`);

/** Opens the page with the scroll `<canvas>` elements mounted. */
async function openAt(page: Page, container: string) {
  await page.goto(PAGE);
  await expect(page.locator('[data-effect-layer="scroll"]')).toHaveCount(2, {
    timeout: MOUNT_TIMEOUT,
  });
  await scrollElementTo(page, benchElement(page, container), 200);
}

/** The most dust pixels a region shows in any of several reads. */
async function mostDustPixels(
  page: Page,
  rect: { x: number; y: number; width: number; height: number },
) {
  let most = 0;
  const end = Date.now() + WATCH_MILLISECONDS;
  while (Date.now() < end) {
    most = Math.max(most, await countDustPixels(page, rect));
    await page.waitForTimeout(250);
  }
  return most;
}

test("keeps dust in its container, where a fan on the page does not reach", async ({
  page,
}) => {
  await openAt(page, "dust-container");
  const container = await boxOf(benchElement(page, "dust-container"));
  const source = await boxOf(benchElement(page, "inner-source"));
  const fan = await boxOf(benchElement(page, "page-fan"));

  // The padding above and left of the dust, inside the container.
  const above = {
    x: container.x + 4,
    y: container.y + 4,
    width: source.x + source.width - container.x,
    height: source.y - container.y - 6,
  };
  await expect
    .poll(() => countDustPixels(page, above), { timeout: FLOW_TIMEOUT })
    .toBeGreaterThan(4);

  const between = {
    x: container.x + container.width + 4,
    y: container.y - 16,
    width: fan.x - container.x - container.width - 8,
    height: container.height + 56,
  };
  const outsideLeftAndTop = {
    x: container.x - 40,
    y: container.y - 18,
    width: source.x + source.width - container.x + 40,
    height: 16,
  };
  // The far side of the container, which its dust does not drift to unless
  // a fan pulls it there.
  const farSide = {
    x: container.x + 340,
    y: container.y + 4,
    width: container.width - 344,
    height: container.height - 8,
  };
  expect(await mostDustPixels(page, farSide)).toBe(0);
  expect(await countDustPixels(page, between)).toBe(0);
  expect(await countDustPixels(page, outsideLeftAndTop)).toBe(0);
});

test("keeps the dust of the page out of a container's fan", async ({
  page,
}) => {
  await openAt(page, "fan-container");
  const container = await boxOf(benchElement(page, "fan-container"));
  const source = await boxOf(benchElement(page, "page-source"));
  const fan = await boxOf(benchElement(page, "inner-fan"));

  const aroundSource = {
    x: source.x - 4,
    y: source.y - 40,
    width: source.width + 8,
    height: 36,
  };
  await expect
    .poll(() => countDustPixels(page, aroundSource), { timeout: FLOW_TIMEOUT })
    .toBeGreaterThan(4);

  // The page just before the container: too far for the dust to drift to,
  // and in reach of the container's fan if the container let it pull.
  const beforeContainer = {
    x: container.x - 100,
    y: container.y + 4,
    width: 96,
    height: container.height - 8,
  };
  // The container's padding between its edge and its fan.
  const inside = {
    x: container.x + 8,
    y: container.y + 8,
    width: fan.x - container.x - 16,
    height: container.height - 16,
  };
  expect(await mostDustPixels(page, beforeContainer)).toBe(0);
  expect(await countDustPixels(page, inside)).toBe(0);
});

test("clips rings to the edge of their container", async ({ page }) => {
  await openAt(page, "ripple-container");
  const container = await boxOf(benchElement(page, "ripple-container"));
  const tile = await boxOf(benchElement(page, "inner-ripple"));

  // The container left of the element, where the rings show.
  const inside = {
    x: container.x + 4,
    y: container.y + 2,
    width: tile.x - container.x - 6,
    height: container.height - 4,
  };
  // The page right of the container, inside the rings' reach.
  const outside = {
    x: container.x + container.width + 3,
    y: container.y,
    width: 28,
    height: container.height,
  };
  // Each press starts a pulse, so press again until the rings show.
  let outsideMost = 0;
  await page.mouse.move(tile.x + tile.width / 2, tile.y + tile.height / 2);
  await expect
    .poll(
      async () => {
        await page.mouse.down();
        await page.waitForTimeout(150);
        const shown = await countDustPixels(page, inside);
        outsideMost = Math.max(
          outsideMost,
          await countDustPixels(page, outside),
        );
        await page.mouse.up();
        return shown;
      },
      { timeout: FLOW_TIMEOUT },
    )
    .toBeGreaterThan(4);
  await page.mouse.down();
  outsideMost = Math.max(outsideMost, await mostDustPixels(page, outside));
  await page.mouse.up();
  expect(outsideMost).toBe(0);
});
