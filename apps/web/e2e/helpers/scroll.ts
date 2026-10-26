import { expect, type Locator, type Page } from "@playwright/test";

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

/** Scrolls to `y`, or as far as the document goes, and holds there. */
export async function scrollWithin(page: Page, y: number) {
  const end = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  await scrollToAndSettle(page, Math.max(0, Math.min(Math.round(y), end)));
}

/** The element's box in the viewport. */
export async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error("the element has no box");
  }
  return box;
}

/** Scrolls so the element's top sits `offset` px below the viewport top. */
export async function scrollElementTo(
  page: Page,
  locator: Locator,
  offset: number,
) {
  const top = await locator.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  await scrollWithin(page, top - offset);
}

/** How far the page is scrolled. */
export function readScrollY(page: Page) {
  return page.evaluate(() => window.scrollY);
}

/**
 * Turns the mouse wheel over the middle of the viewport by `deltaY`, and
 * waits until the page scrolls. Gives how far it is scrolled.
 */
export async function wheelPage(page: Page, deltaY: number) {
  const viewport = page.viewportSize();
  if (viewport !== null) {
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
  }
  await page.mouse.wheel(0, deltaY);
  await expect.poll(() => readScrollY(page)).toBeGreaterThan(0);
  return readScrollY(page);
}
