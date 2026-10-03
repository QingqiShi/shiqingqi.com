import type { Page } from "@playwright/test";

/**
 * Scroll to `y` and hold there. Until the content is tall enough, `scrollTo`
 * clamps on a still-hydrating page and never sticks (source of a shard-5
 * flake), so poll until the scroll actually holds.
 */
export async function scrollToAndSettle(page: Page, y: number) {
  await page.waitForFunction((target) => {
    window.scrollTo(0, target);
    return window.scrollY === target;
  }, y);
}
