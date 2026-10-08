import { expect, test } from "@playwright/test";
import { AUDIT_ROUTES } from "./helpers/audit-routes.ts";
import {
  findHitAreaOverflow,
  inspectTouchTargets,
} from "./helpers/inspect-touch-targets.ts";

const PHONE = { width: 390, height: 844 };

// The same declarations as `a11y.touchTarget`.
const TOUCH_TARGET_CSS = `
  .t { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  @media (pointer: coarse) {
    .t { position: relative; isolation: isolate; }
    .t::after { content: ""; position: absolute; inset: min(0px, calc(50% - 22px)); z-index: -1; }
  }
  button { inline-size: 24px; block-size: 24px; padding: 0; border: 0; }
`;

test.describe("touch target check", () => {
  test.use({ viewport: PHONE, hasTouch: true, isMobile: true });

  test("tells a full hit area from a small, clipped or stealing one", async ({
    page,
  }) => {
    await page.setContent(`
      <style>${TOUCH_TARGET_CSS}</style>
      <div style="padding: 40px; display: grid; gap: 40px; justify-items: start">
        <button class="t" aria-label="Full"></button>
        <button aria-label="Bare" style="touch-action: manipulation; -webkit-tap-highlight-color: transparent"></button>
        <div style="overflow: hidden"><button class="t" aria-label="Clipped"></button></div>
        <div style="display: flex; gap: 4px">
          <button class="t" aria-label="Left"></button>
          <button class="t" aria-label="Right"></button>
        </div>
        <div style="display: flex; gap: 24px">
          <button class="t" aria-label="Spaced"></button>
          <button class="t" aria-label="Apart"></button>
        </div>
        <div style="display: flex; gap: 4px">
          <textarea aria-label="Field" style="block-size: 24px"></textarea>
          <button class="t" aria-label="Send"></button>
        </div>
        <button aria-label="Plain"></button>
      </div>
    `);

    const { checked, failures } = await page.evaluate(inspectTouchTargets);
    expect(checked).toBe(9);
    expect(failures.map((failure) => failure.replace(/ at .*$/, ""))).toEqual([
      '<button> "Bare": hit area 24.0x24.0, smaller than 44px',
      '<button> "Clipped": hit area covered by <div> ""',
      '<button> "Left": <button> "Right" takes taps on its edge',
      '<button> "Send": takes taps from <textarea> "Field"',
      '<button> "Plain": 24.0x24.0, with no touch target',
    ]);
  });

  test("tells a hit area that makes a container scroll", async ({ page }) => {
    await page.setContent(`
      <style>${TOUCH_TARGET_CSS}</style>
      <div aria-label="Tight" style="overflow: auto; display: flex; padding: 0">
        <button class="t" aria-label="Edge"></button>
      </div>
      <div aria-label="Roomy" style="overflow: auto; display: flex; padding: 12px">
        <button class="t" aria-label="Inside"></button>
      </div>
    `);

    expect(await page.evaluate(findHitAreaOverflow)).toEqual([
      '<div> "Tight": scrolls 10px on y only because of a hit area',
    ]);
  });
});

test.describe(`touch targets at ${String(PHONE.width)}px`, () => {
  test.use({ viewport: PHONE, hasTouch: true, isMobile: true });
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  for (const route of AUDIT_ROUTES) {
    test(route.name, async ({ page }) => {
      await page.goto(route.path);
      // A dev server compiles a route on the first hit, which outruns the
      // default expect timeout.
      await expect(page.locator(route.ready).first()).toBeVisible({
        timeout: 60_000,
      });
      await route.open?.(page);
      await page.evaluate(() => document.fonts.ready);
      const { checked, failures } = await page.evaluate(inspectTouchTargets);
      expect(checked).toBeGreaterThan(0);
      expect
        .soft(
          failures,
          "Every control takes a tap across 44px, and only its own",
        )
        .toEqual([]);
      expect
        .soft(
          await page.evaluate(findHitAreaOverflow),
          "No hit area makes a container scroll",
        )
        .toEqual([]);
    });
  }
});

test.describe("touch targets with a mouse", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("add no hit area", async ({ page }) => {
    test.slow();
    for (const path of [
      "/design-system/components/button",
      "/design-system/components/chip",
      "/design-system/components/card",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible({ timeout: 60_000 });
      const hitAreas = await page.evaluate(
        () =>
          [...document.querySelectorAll("*")].filter((node) => {
            if (getComputedStyle(node).touchAction !== "manipulation") {
              return false;
            }
            const after = getComputedStyle(node, "::after");
            return (
              after.content !== "none" &&
              after.position === "absolute" &&
              after.zIndex === "-1"
            );
          }).length,
      );
      expect(hitAreas, path).toBe(0);
    }
  });
});
