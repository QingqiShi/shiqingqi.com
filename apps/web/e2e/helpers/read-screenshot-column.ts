import type { Page } from "@playwright/test";
import { readScreenshotRegion } from "./read-screenshot-region.ts";

/** The colour of every row of one column of a screenshot, as `r,g,b`. */
export async function readScreenshotColumn(page: Page, x: number) {
  const height = page.viewportSize()?.height ?? 0;
  const rows = await readScreenshotRegion(page, { x, y: 0, width: 1, height });
  return rows.map((row) => row[0].join(","));
}
