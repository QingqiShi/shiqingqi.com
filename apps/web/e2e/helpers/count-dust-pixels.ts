import type { Page } from "@playwright/test";
import { readScreenshotRegion } from "./read-screenshot-region.ts";

const CHANNEL_DIFFERENCE = 24;

/**
 * How many pixels of a part of the viewport differ from its most common
 * colour, the page background where the test reads it.
 */
export async function countDustPixels(
  page: Page,
  rect: { x: number; y: number; width: number; height: number },
) {
  const pixels = (await readScreenshotRegion(page, rect)).flat();
  const counts = new Map<string, number>();
  for (const pixel of pixels) {
    const key = pixel.join();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [background] = [...counts].reduce((most, entry) =>
    entry[1] > most[1] ? entry : most,
  );
  const base = background.split(",").map(Number);
  return pixels.filter(
    (pixel) =>
      Math.max(...pixel.map((channel, at) => Math.abs(channel - base[at]))) >
      CHANNEL_DIFFERENCE,
  ).length;
}
