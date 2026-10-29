import { expect, type Page } from "@playwright/test";

/**
 * Waits until every motion of the page's motion engines is at rest. The
 * engine marks each element that a motion moves with `data-moving` until
 * the motion comes to rest.
 */
export async function waitForMotionToSettle(page: Page) {
  // A slow page shows at most 1/30 s of motion in a frame, so a motion can
  // take longer than the time of its curve.
  await expect(page.locator("[data-moving]")).toHaveCount(0, {
    timeout: 15_000,
  });
}
