import type { Locator, Page } from "@playwright/test";
import { readScreenshotRegion } from "./read-screenshot-region.ts";
import { boxOf } from "./scroll.ts";

/** Whether the effect layer draws the liquid of `group` now. */
export function isDrawn(group: Locator) {
  return group.evaluate((element) => element.hasAttribute("data-effect-drawn"));
}

/**
 * How many px of a region differ much from the same region in `baseline`,
 * outside `label`, whose colour changes with the selection.
 */
function changedPixels(
  region: number[][][],
  baseline: number[][][],
  label: { x: number; y: number; width: number; height: number },
) {
  let changed = 0;
  for (const [row, pixels] of region.entries()) {
    for (const [column, pixel] of pixels.entries()) {
      if (
        column >= label.x &&
        column < label.x + label.width &&
        row >= label.y &&
        row < label.y + label.height
      ) {
        continue;
      }
      const before = baseline[row]?.[column] ?? pixel;
      const distance = Math.max(
        ...pixel.map((channel, index) =>
          Math.abs(channel - (before[index] ?? 0)),
        ),
      );
      if (distance > 48) {
        changed += 1;
      }
    }
  }
  return changed;
}

/**
 * Taps `segment` of the Segmented control `group`, and returns the most px
 * of it that differ much from the plain track while the liquid draws, and
 * how many reads it took while the liquid drew. The control hides its own
 * indicator while the liquid draws. In the dark scheme the liquid has a lit
 * edge, which the dark track does not have.
 */
export async function tapAndReadLiquid(
  page: Page,
  group: Locator,
  segment: Locator,
) {
  const box = await boxOf(segment);
  const region = {
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
  };
  // The label's box in the region, with 2px around it for antialiasing.
  const label = await segment.evaluate((element, origin) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const text = range.getBoundingClientRect();
    return {
      x: Math.floor(text.x - origin.x) - 2,
      y: Math.floor(text.y - origin.y) - 2,
      width: Math.ceil(text.width) + 4,
      height: Math.ceil(text.height) + 4,
    };
  }, region);
  await segment.hover();
  const track = await readScreenshotRegion(page, region);
  await segment.click();
  let most = 0;
  let reads = 0;
  const end = Date.now() + 5_000;
  while (Date.now() < end) {
    const drawnBefore = await isDrawn(group);
    const shot = await readScreenshotRegion(page, region);
    const drawnAfter = await isDrawn(group);
    if (drawnBefore && drawnAfter) {
      reads += 1;
      most = Math.max(most, changedPixels(shot, track, label));
    } else if (reads > 0) {
      break;
    }
  }
  return { most, reads };
}
